#pragma once

#include <fbjni/fbjni.h>
#include <react/jni/JRuntimeExecutor.h>

namespace melon {

class MelonSQLiteJni : public facebook::jni::JavaClass<MelonSQLiteJni> {
 public:
  static auto constexpr kJavaDescriptor = "Lcom/melon/sqlite/MelonSQLiteJni;";

  static void install(
      facebook::jni::alias_ref<jclass> /* unused */,
      facebook::jni::alias_ref<facebook::react::JRuntimeExecutor::javaobject>
          runtimeExecutor);

  static void registerNatives();
};

} // namespace melon
