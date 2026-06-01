#include "MelonSQLiteJni.h"

#include <jsi/jsi.h>
#include <react/jni/JRuntimeExecutor.h>

#include "MelonSQLiteInstaller.h"

namespace melon {

using facebook::jni::alias_ref;
using facebook::react::JRuntimeExecutor;

void MelonSQLiteJni::install(
    alias_ref<jclass> /* unused */,
    alias_ref<JRuntimeExecutor::javaobject> runtimeExecutor) {
  auto executor = runtimeExecutor->cthis()->get();
  executor([](facebook::jsi::Runtime &runtime) {
    installMelonSqliteJsi(runtime);
  });
}

void MelonSQLiteJni::registerNatives() {
  javaClassStatic()->registerNatives({
      makeNativeMethod("install", MelonSQLiteJni::install),
  });
}

} // namespace melon
