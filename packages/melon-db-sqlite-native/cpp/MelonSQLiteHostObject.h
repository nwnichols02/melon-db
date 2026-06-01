#pragma once

#include <jsi/jsi.h>
#include <memory>

namespace melon {

std::shared_ptr<facebook::jsi::HostObject> createMelonSQLiteHostObject();

} // namespace melon
