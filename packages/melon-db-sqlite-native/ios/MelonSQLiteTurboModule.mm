#import "MelonSQLiteTurboModule.h"

#import "../cpp/MelonSQLiteInstaller.h"
#import "../cpp/MelonSQLiteScheduler.h"

#if __has_include(<ReactCommon/CallInvoker.h>)
#import <ReactCommon/CallInvoker.h>
#define MELON_HAS_CALL_INVOKER 1
#endif

namespace facebook::react {
namespace {

using facebook::jsi::Runtime;
using facebook::jsi::Value;

void ensureMelonJsiInstalled(Runtime &runtime) {
  melon::installMelonSqliteJsi(runtime);
}

Value hostOpen(Runtime &runtime, TurboModule &turboModule, const Value *args, size_t count) {
  ensureMelonJsiInstalled(runtime);
  return static_cast<ObjCTurboModule &>(turboModule).invokeObjCMethod(
      runtime, PromiseKind, "open", @selector(open:resolve:reject:), args, count);
}

Value hostClose(Runtime &runtime, TurboModule &turboModule, const Value *args, size_t count) {
  ensureMelonJsiInstalled(runtime);
  return static_cast<ObjCTurboModule &>(turboModule).invokeObjCMethod(
      runtime, PromiseKind, "close", @selector(close:reject:), args, count);
}

Value hostExec(Runtime &runtime, TurboModule &turboModule, const Value *args, size_t count) {
  ensureMelonJsiInstalled(runtime);
  return static_cast<ObjCTurboModule &>(turboModule).invokeObjCMethod(
      runtime, PromiseKind, "exec", @selector(exec:resolve:reject:), args, count);
}

Value hostQueryAll(Runtime &runtime, TurboModule &turboModule, const Value *args, size_t count) {
  ensureMelonJsiInstalled(runtime);
  return static_cast<ObjCTurboModule &>(turboModule).invokeObjCMethod(
      runtime,
      PromiseKind,
      "queryAll",
      @selector(queryAll:params:resolve:reject:),
      args,
      count);
}

Value hostQueryFirst(Runtime &runtime, TurboModule &turboModule, const Value *args, size_t count) {
  ensureMelonJsiInstalled(runtime);
  return static_cast<ObjCTurboModule &>(turboModule).invokeObjCMethod(
      runtime,
      PromiseKind,
      "queryFirst",
      @selector(queryFirst:params:resolve:reject:),
      args,
      count);
}

Value hostRun(Runtime &runtime, TurboModule &turboModule, const Value *args, size_t count) {
  ensureMelonJsiInstalled(runtime);
  return static_cast<ObjCTurboModule &>(turboModule).invokeObjCMethod(
      runtime, PromiseKind, "run", @selector(run:params:resolve:reject:), args, count);
}

} // namespace

MelonSQLiteTurboModuleJSI::MelonSQLiteTurboModuleJSI(
    const ObjCTurboModule::InitParams &params)
    : NativeMelonSQLiteSpecJSI(params) {
#if MELON_HAS_CALL_INVOKER
  if (params.jsInvoker != nullptr) {
    auto invoker = params.jsInvoker;
    melon::setMelonJsScheduler([invoker](
                                   std::function<void(facebook::jsi::Runtime &)> work) {
      invoker->invokeAsync(
          [work = std::move(work)](facebook::jsi::Runtime &runtime) { work(runtime); });
    });
  }
#endif
  methodMap_["open"] = MethodMetadata{1, hostOpen};
  methodMap_["close"] = MethodMetadata{0, hostClose};
  methodMap_["exec"] = MethodMetadata{1, hostExec};
  methodMap_["queryAll"] = MethodMetadata{2, hostQueryAll};
  methodMap_["queryFirst"] = MethodMetadata{2, hostQueryFirst};
  methodMap_["run"] = MethodMetadata{2, hostRun};
}

} // namespace facebook::react
