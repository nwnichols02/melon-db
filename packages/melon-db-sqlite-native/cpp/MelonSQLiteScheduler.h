#pragma once

#include <functional>
#include <jsi/jsi.h>
#include <mutex>

namespace melon {

using MelonJsScheduler =
    std::function<void(std::function<void(facebook::jsi::Runtime &)>)>;

/**
 * Schedules work on the JavaScript thread (RuntimeExecutor / CallInvoker).
 */
class MelonSQLiteScheduler {
 public:
  static MelonSQLiteScheduler &instance();

  void setScheduler(MelonJsScheduler scheduler);
  void schedule(std::function<void(facebook::jsi::Runtime &)> work);
  bool hasScheduler() const;

 private:
  mutable std::mutex mutex_;
  MelonJsScheduler scheduler_;
};

} // namespace melon
