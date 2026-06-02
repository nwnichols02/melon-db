#include "MelonSQLiteHostObject.h"

#include "MelonSQLiteScheduler.h"

#include <sqlite3.h>

#include <atomic>
#include <cstdint>
#include <cstring>
#include <memory>
#include <functional>
#include <map>
#include <memory>
#include <optional>
#include <stdexcept>
#include <string>
#include <variant>
#include <vector>

#ifdef __APPLE__
#include <dispatch/dispatch.h>
#endif

#ifdef __ANDROID__
#include <condition_variable>
#include <future>
#include <mutex>
#include <queue>
#include <thread>
#endif

namespace melon {
namespace {

using facebook::jsi::Function;
using facebook::jsi::HostObject;
using facebook::jsi::JSError;
using facebook::jsi::Object;
using facebook::jsi::PropNameID;
using facebook::jsi::Runtime;
using facebook::jsi::String;
using facebook::jsi::Value;
using facebook::jsi::Array;

using SqlCell = std::variant<std::monostate, int64_t, double, std::string>;
using SqlRow = std::map<std::string, SqlCell>;
using SqlRows = std::vector<SqlRow>;

struct SqlBindParam {
  enum class Kind { Null, Bool, Int, Double, String };
  Kind kind = Kind::Null;
  bool boolValue = false;
  int64_t intValue = 0;
  double doubleValue = 0;
  std::string stringValue;
};

#ifdef __ANDROID__
class AndroidDbSerialQueue {
 public:
  AndroidDbSerialQueue() : worker_([this]() { runWorker(); }) {}

  ~AndroidDbSerialQueue() {
    {
      std::lock_guard<std::mutex> lock(mutex_);
      stop_ = true;
    }
    cv_.notify_all();
    if (worker_.joinable()) {
      worker_.join();
    }
  }

  void run(const std::function<void()> &fn) {
    if (onWorkerThread_) {
      fn();
      return;
    }
    std::promise<void> done;
    auto future = done.get_future();
    {
      std::lock_guard<std::mutex> lock(mutex_);
      queue_.push([&fn, &done]() {
        fn();
        done.set_value();
      });
    }
    cv_.notify_one();
    future.wait();
  }

 private:
  void runWorker() {
    onWorkerThread_ = true;
    while (true) {
      std::function<void()> task;
      {
        std::unique_lock<std::mutex> lock(mutex_);
        cv_.wait(lock, [this]() { return stop_ || !queue_.empty(); });
        if (stop_ && queue_.empty()) {
          return;
        }
        task = std::move(queue_.front());
        queue_.pop();
      }
      task();
    }
  }

  std::mutex mutex_;
  std::condition_variable cv_;
  std::queue<std::function<void()>> queue_;
  std::thread worker_;
  bool stop_ = false;
  thread_local static bool onWorkerThread_;
};

thread_local bool AndroidDbSerialQueue::onWorkerThread_ = false;
#endif

class MelonSQLiteHostObject : public HostObject {
 public:
  MelonSQLiteHostObject() {
#ifdef __APPLE__
    dbQueue_ = dispatch_queue_create("com.melon.sqlite", DISPATCH_QUEUE_SERIAL);
    queueKey_ = &dbQueueKey_;
    dispatch_queue_set_specific(dbQueue_, queueKey_, queueKey_, nullptr);
#endif
  }

  ~MelonSQLiteHostObject() override {
    runOnDbQueue([this]() {
      if (db_ != nullptr) {
        clearUpdateHook();
        sqlite3_close(db_);
        db_ = nullptr;
      }
    });
    clearObservationCallback();
#ifdef __APPLE__
    if (dbQueue_ != nullptr) {
      dispatch_release(dbQueue_);
      dbQueue_ = nullptr;
    }
#endif
#ifdef __ANDROID__
    androidDbQueue_.reset();
#endif
  }

  Value get(Runtime &rt, const PropNameID &name) override {
    auto prop = name.utf8(rt);

    if (prop == "openSync") {
      return Function::createFromHostFunction(
          rt,
          name,
          1,
          [this](Runtime &runtime,
                 const Value &thisValue,
                 const Value *args,
                 size_t count) -> Value {
            try {
              if (count < 1 || !args[0].isString()) {
                throw JSError(runtime, "openSync(path) requires a string path");
              }
              const std::string path = args[0].asString(runtime).utf8(runtime);
              runOnDbQueue([this, path]() { openDatabase(path); });
              return Value::undefined();
            } catch (const JSError &) {
              throw;
            } catch (const std::exception &error) {
              throw JSError(runtime, error.what());
            }
          });
    }

    if (prop == "closeSync") {
      return Function::createFromHostFunction(
          rt,
          name,
          0,
          [this](Runtime &runtime,
                 const Value &thisValue,
                 const Value *args,
                 size_t count) -> Value {
            try {
              runOnDbQueue([this]() {
                if (db_ != nullptr) {
                  clearUpdateHook();
                  sqlite3_close(db_);
                  db_ = nullptr;
                }
              });
              clearObservationCallback();
              return Value::undefined();
            } catch (const JSError &) {
              throw;
            } catch (const std::exception &error) {
              throw JSError(runtime, error.what());
            }
          });
    }

    if (prop == "execSync") {
      return Function::createFromHostFunction(
          rt,
          name,
          1,
          [this](Runtime &runtime,
                 const Value &thisValue,
                 const Value *args,
                 size_t count) -> Value {
            try {
              if (count < 1 || !args[0].isString()) {
                throw JSError(runtime, "execSync(sql) requires a string");
              }
              const std::string sql = args[0].asString(runtime).utf8(runtime);
              runOnDbQueue([this, sql]() { execSql(sql); });
              return Value::undefined();
            } catch (const JSError &) {
              throw;
            } catch (const std::exception &error) {
              throw JSError(runtime, error.what());
            }
          });
    }

    if (prop == "queryAllSync") {
      return Function::createFromHostFunction(
          rt,
          name,
          2,
          [this](Runtime &runtime,
                 const Value &thisValue,
                 const Value *args,
                 size_t count) -> Value {
            try {
              if (count < 1 || !args[0].isString()) {
                throw JSError(
                    runtime, "queryAllSync(sql, params?) requires sql string");
              }
              const std::string sql = args[0].asString(runtime).utf8(runtime);
              const std::vector<SqlBindParam> params =
                  parseBindParams(runtime, count > 1 ? &args[1] : nullptr);
              SqlRows rows;
              runOnDbQueue(
                  [this, &sql, &params, &rows]() { rows = queryAllNative(sql, params); });
              return rowsToArray(runtime, rows);
            } catch (const JSError &) {
              throw;
            } catch (const std::exception &error) {
              throw JSError(runtime, error.what());
            }
          });
    }

    if (prop == "queryFirstSync") {
      return Function::createFromHostFunction(
          rt,
          name,
          2,
          [this](Runtime &runtime,
                 const Value &thisValue,
                 const Value *args,
                 size_t count) -> Value {
            try {
              if (count < 1 || !args[0].isString()) {
                throw JSError(
                    runtime, "queryFirstSync(sql, params?) requires sql string");
              }
              const std::string sql = args[0].asString(runtime).utf8(runtime);
              const std::vector<SqlBindParam> params =
                  parseBindParams(runtime, count > 1 ? &args[1] : nullptr);
              std::optional<SqlRow> row;
              runOnDbQueue([this, &sql, &params, &row]() {
                row = queryFirstNative(sql, params);
              });
              if (!row.has_value()) {
                return Value::null();
              }
              return rowToObject(runtime, row.value());
            } catch (const JSError &) {
              throw;
            } catch (const std::exception &error) {
              throw JSError(runtime, error.what());
            }
          });
    }

    if (prop == "runSync") {
      return Function::createFromHostFunction(
          rt,
          name,
          2,
          [this](Runtime &runtime,
                 const Value &thisValue,
                 const Value *args,
                 size_t count) -> Value {
            try {
              if (count < 1 || !args[0].isString()) {
                throw JSError(runtime, "runSync(sql, params?) requires sql string");
              }
              const std::string sql = args[0].asString(runtime).utf8(runtime);
              const std::vector<SqlBindParam> params =
                  parseBindParams(runtime, count > 1 ? &args[1] : nullptr);
              runOnDbQueue(
                  [this, &sql, &params]() { runStatementNative(sql, params); });
              return Value::undefined();
            } catch (const JSError &) {
              throw;
            } catch (const std::exception &error) {
              throw JSError(runtime, error.what());
            }
          });
    }

    if (prop == "setObservationFlushCallback") {
      return Function::createFromHostFunction(
          rt,
          name,
          1,
          [this](Runtime &runtime,
                 const Value &thisValue,
                 const Value *args,
                 size_t count) -> Value {
            try {
              if (count < 1 || !args[0].isObject() ||
                  !args[0].asObject(runtime).isFunction(runtime)) {
                throw JSError(
                    runtime,
                    "setObservationFlushCallback requires a function");
              }
              observationFlush_ = std::make_shared<Function>(
                  args[0].asObject(runtime).asFunction(runtime));
              observationRuntime_ = &runtime;
              return Value::undefined();
            } catch (const JSError &) {
              throw;
            } catch (const std::exception &error) {
              throw JSError(runtime, error.what());
            }
          });
    }

    if (prop == "removeObservationFlushCallback") {
      return Function::createFromHostFunction(
          rt,
          name,
          0,
          [this](Runtime &runtime,
                 const Value &thisValue,
                 const Value *args,
                 size_t count) -> Value {
            try {
              (void)runtime;
              (void)thisValue;
              (void)args;
              (void)count;
              clearObservationCallback();
              return Value::undefined();
            } catch (const JSError &) {
              throw;
            } catch (const std::exception &error) {
              throw JSError(runtime, error.what());
            }
          });
    }

    return Value::undefined();
  }

 private:
  static void *dbQueueKey_;

  sqlite3 *db_ = nullptr;
  std::shared_ptr<Function> observationFlush_;
  Runtime *observationRuntime_ = nullptr;
  std::atomic<bool> pendingObservationFlush_{false};
#ifdef __APPLE__
  dispatch_queue_t dbQueue_ = nullptr;
  void *queueKey_ = nullptr;
#endif
#ifdef __ANDROID__
  std::unique_ptr<AndroidDbSerialQueue> androidDbQueue_ =
      std::make_unique<AndroidDbSerialQueue>();
#endif

  void clearObservationCallback() {
    observationFlush_.reset();
    observationRuntime_ = nullptr;
    pendingObservationFlush_.store(false);
  }

  void invokeObservationFlush(Runtime &runtime) {
    if (!observationFlush_) {
      return;
    }
    observationFlush_->call(runtime);
  }

  void scheduleObservationFlush() {
    if (!MelonSQLiteScheduler::instance().hasScheduler()) {
      return;
    }
    if (pendingObservationFlush_.exchange(true)) {
      return;
    }
    MelonSQLiteScheduler::instance().schedule([this](Runtime &runtime) {
      pendingObservationFlush_.store(false);
      invokeObservationFlush(runtime);
    });
  }

  static void updateHook(
      void *self,
      int /* op */,
      const char * /* dbName */,
      const char * /* table */,
      sqlite3_int64 /* rowid */) {
    auto *host = static_cast<MelonSQLiteHostObject *>(self);
    host->scheduleObservationFlush();
  }

  void installUpdateHook() {
    if (db_ == nullptr) {
      return;
    }
    sqlite3_update_hook(db_, &MelonSQLiteHostObject::updateHook, this);
  }

  void clearUpdateHook() {
    if (db_ == nullptr) {
      return;
    }
    sqlite3_update_hook(db_, nullptr, nullptr);
  }

  void runOnDbQueue(const std::function<void()> &fn) {
#ifdef __APPLE__
    if (dispatch_get_specific(queueKey_) != nullptr) {
      fn();
      return;
    }
    dispatch_sync(dbQueue_, ^{
      fn();
    });
#elif defined(__ANDROID__)
    androidDbQueue_->run(fn);
#else
    fn();
#endif
  }

  void ensureOpen() {
    if (db_ == nullptr) {
      throw std::runtime_error("Database not open. Call openSync(path) first.");
    }
  }

  void openDatabase(const std::string &path) {
    if (path.find("..") != std::string::npos) {
      throw std::runtime_error("Database path must not contain '..'");
    }
    if (db_ != nullptr) {
      sqlite3_close(db_);
      db_ = nullptr;
    }
    int rc = sqlite3_open(path.c_str(), &db_);
    if (rc != SQLITE_OK) {
      std::string message =
          db_ ? sqlite3_errmsg(db_) : "Failed to open database";
      if (db_ != nullptr) {
        sqlite3_close(db_);
        db_ = nullptr;
      }
      throw std::runtime_error(message);
    }
    sqlite3_busy_timeout(db_, 5000);
    installUpdateHook();
  }

  void execSql(const std::string &sql) {
    ensureOpen();
    char *errMsg = nullptr;
    int rc = sqlite3_exec(db_, sql.c_str(), nullptr, nullptr, &errMsg);
    if (rc != SQLITE_OK) {
      std::string message = errMsg ? errMsg : "exec failed";
      if (errMsg) {
        sqlite3_free(errMsg);
      }
      throw std::runtime_error(message);
    }
  }

  static std::vector<SqlBindParam> parseBindParams(
      Runtime &runtime,
      const Value *paramsValue) {
    std::vector<SqlBindParam> params;
    if (paramsValue == nullptr || paramsValue->isUndefined() ||
        paramsValue->isNull()) {
      return params;
    }
    if (!paramsValue->isObject() ||
        !paramsValue->asObject(runtime).isArray(runtime)) {
      throw std::runtime_error("params must be an array");
    }
    Array array = paramsValue->asObject(runtime).asArray(runtime);
    const size_t count = array.size(runtime);
    params.reserve(count);
    for (size_t i = 0; i < count; i++) {
      const Value param = array.getValueAtIndex(runtime, i);
      SqlBindParam bind;
      if (param.isNull() || param.isUndefined()) {
        bind.kind = SqlBindParam::Kind::Null;
      } else if (param.isBool()) {
        bind.kind = SqlBindParam::Kind::Bool;
        bind.boolValue = param.getBool();
      } else if (param.isNumber()) {
        const double number = param.asNumber();
        const double intPart = static_cast<double>(static_cast<int64_t>(number));
        if (number == intPart) {
          bind.kind = SqlBindParam::Kind::Int;
          bind.intValue = static_cast<int64_t>(number);
        } else {
          bind.kind = SqlBindParam::Kind::Double;
          bind.doubleValue = number;
        }
      } else if (param.isString()) {
        bind.kind = SqlBindParam::Kind::String;
        bind.stringValue = param.asString(runtime).utf8(runtime);
      } else {
        throw std::runtime_error(
            "Unsupported bind param at index " + std::to_string(i));
      }
      params.push_back(std::move(bind));
    }
    return params;
  }

  static void bindNativeParams(
      sqlite3_stmt *stmt,
      const std::vector<SqlBindParam> &params) {
    for (size_t i = 0; i < params.size(); i++) {
      const SqlBindParam &param = params[i];
      const int bindIndex = static_cast<int>(i) + 1;
      int rc = SQLITE_OK;
      switch (param.kind) {
        case SqlBindParam::Kind::Null:
          rc = sqlite3_bind_null(stmt, bindIndex);
          break;
        case SqlBindParam::Kind::Bool:
          rc = sqlite3_bind_int(stmt, bindIndex, param.boolValue ? 1 : 0);
          break;
        case SqlBindParam::Kind::Int:
          rc = sqlite3_bind_int64(stmt, bindIndex, param.intValue);
          break;
        case SqlBindParam::Kind::Double:
          rc = sqlite3_bind_double(stmt, bindIndex, param.doubleValue);
          break;
        case SqlBindParam::Kind::String:
          rc = sqlite3_bind_text(
              stmt,
              bindIndex,
              param.stringValue.c_str(),
              -1,
              SQLITE_TRANSIENT);
          break;
      }
      if (rc != SQLITE_OK) {
        throw std::runtime_error(sqlite3_errmsg(sqlite3_db_handle(stmt)));
      }
    }
  }

  static SqlCell readColumn(sqlite3_stmt *stmt, int index) {
    switch (sqlite3_column_type(stmt, index)) {
      case SQLITE_INTEGER:
        return SqlCell(sqlite3_column_int64(stmt, index));
      case SQLITE_FLOAT:
        return SqlCell(sqlite3_column_double(stmt, index));
      case SQLITE_TEXT: {
        const unsigned char *text = sqlite3_column_text(stmt, index);
        if (text == nullptr) {
          return SqlCell(std::monostate{});
        }
        return SqlCell(std::string(reinterpret_cast<const char *>(text)));
      }
      case SQLITE_BLOB:
      case SQLITE_NULL:
      default:
        return SqlCell(std::monostate{});
    }
  }

  static SqlRow readRow(sqlite3_stmt *stmt) {
    SqlRow row;
    const int columnCount = sqlite3_column_count(stmt);
    for (int i = 0; i < columnCount; i++) {
      const char *name = sqlite3_column_name(stmt, i);
      const std::string key =
          name != nullptr ? name : ("col_" + std::to_string(i));
      row[key] = readColumn(stmt, i);
    }
    return row;
  }

  static Value cellToValue(Runtime &runtime, const SqlCell &cell) {
    if (std::holds_alternative<std::monostate>(cell)) {
      return Value::null();
    }
    if (const auto *intValue = std::get_if<int64_t>(&cell)) {
      return Value(static_cast<double>(*intValue));
    }
    if (const auto *doubleValue = std::get_if<double>(&cell)) {
      return Value(*doubleValue);
    }
    if (const auto *stringValue = std::get_if<std::string>(&cell)) {
      return String::createFromUtf8(runtime, *stringValue);
    }
    return Value::null();
  }

  static Object rowToObject(Runtime &runtime, const SqlRow &row) {
    Object object = Object(runtime);
    for (const auto &[key, cell] : row) {
      object.setProperty(
          runtime, PropNameID::forUtf8(runtime, key), cellToValue(runtime, cell));
    }
    return object;
  }

  static Array rowsToArray(Runtime &runtime, const SqlRows &rows) {
    Array array = Array(runtime, rows.size());
    for (size_t i = 0; i < rows.size(); i++) {
      array.setValueAtIndex(runtime, i, rowToObject(runtime, rows[i]));
    }
    return array;
  }

  SqlRows queryAllNative(
      const std::string &sql,
      const std::vector<SqlBindParam> &params) {
    ensureOpen();
    sqlite3_stmt *stmt = nullptr;
    int rc = sqlite3_prepare_v2(db_, sql.c_str(), -1, &stmt, nullptr);
    if (rc != SQLITE_OK) {
      throw std::runtime_error(sqlite3_errmsg(db_));
    }
    bindNativeParams(stmt, params);

    SqlRows rows;
    while ((rc = sqlite3_step(stmt)) == SQLITE_ROW) {
      rows.push_back(readRow(stmt));
    }
    sqlite3_finalize(stmt);
    if (rc != SQLITE_DONE) {
      throw std::runtime_error(sqlite3_errmsg(db_));
    }
    return rows;
  }

  std::optional<SqlRow> queryFirstNative(
      const std::string &sql,
      const std::vector<SqlBindParam> &params) {
    ensureOpen();
    sqlite3_stmt *stmt = nullptr;
    int rc = sqlite3_prepare_v2(db_, sql.c_str(), -1, &stmt, nullptr);
    if (rc != SQLITE_OK) {
      throw std::runtime_error(sqlite3_errmsg(db_));
    }
    bindNativeParams(stmt, params);

    std::optional<SqlRow> row;
    rc = sqlite3_step(stmt);
    if (rc == SQLITE_ROW) {
      row = readRow(stmt);
    } else if (rc != SQLITE_DONE) {
      sqlite3_finalize(stmt);
      throw std::runtime_error(sqlite3_errmsg(db_));
    }
    sqlite3_finalize(stmt);
    return row;
  }

  void runStatementNative(
      const std::string &sql,
      const std::vector<SqlBindParam> &params) {
    ensureOpen();
    sqlite3_stmt *stmt = nullptr;
    int rc = sqlite3_prepare_v2(db_, sql.c_str(), -1, &stmt, nullptr);
    if (rc != SQLITE_OK) {
      throw std::runtime_error(sqlite3_errmsg(db_));
    }
    bindNativeParams(stmt, params);
    rc = sqlite3_step(stmt);
    sqlite3_finalize(stmt);
    if (rc != SQLITE_DONE) {
      throw std::runtime_error(sqlite3_errmsg(db_));
    }
  }
};

void *MelonSQLiteHostObject::dbQueueKey_ = &MelonSQLiteHostObject::dbQueueKey_;

} // namespace

std::shared_ptr<HostObject> createMelonSQLiteHostObject() {
  return std::make_shared<MelonSQLiteHostObject>();
}

} // namespace melon
