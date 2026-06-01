#pragma once

#include <fbjni/fbjni.h>

namespace melon {

class MelonSQLiteJni : public facebook::jni::JavaClass<MelonSQLiteJni> {
 public:
  static auto constexpr kJavaDescriptor = "Lcom/melon/sqlite/MelonSQLiteJni;";

  static void registerNatives();
};

} // namespace melon
