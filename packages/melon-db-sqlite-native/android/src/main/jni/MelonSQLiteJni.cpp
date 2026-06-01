#include "MelonSQLiteJni.h"

#include <jsi/jsi.h>
#include <react/jni/JRuntimeExecutor.h>

#include "MelonSQLiteInstaller.h"

namespace melon {
namespace {

using facebook::jni::alias_ref;
using facebook::jni::JClass;
using facebook::react::JRuntimeExecutor;

void installNative(
    alias_ref<JClass> /* unused */,
    alias_ref<JRuntimeExecutor::javaobject> runtimeExecutor) {
  auto executor = runtimeExecutor->cthis()->get();
  executor([](facebook::jsi::Runtime &runtime) {
    installMelonSqliteJsi(runtime);
  });
}

} // namespace

void MelonSQLiteJni::registerNatives() {
  javaClassStatic()->registerNatives({
      {"install", "(Lcom/facebook/react/bridge/RuntimeExecutor;)V", installNative},
  });
}

} // namespace melon
