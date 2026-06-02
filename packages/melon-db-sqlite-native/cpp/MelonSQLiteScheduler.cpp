#include "MelonSQLiteScheduler.h"

namespace melon {

MelonSQLiteScheduler &MelonSQLiteScheduler::instance() {
  static MelonSQLiteScheduler scheduler;
  return scheduler;
}

void MelonSQLiteScheduler::setScheduler(MelonJsScheduler scheduler) {
  std::lock_guard<std::mutex> lock(mutex_);
  scheduler_ = std::move(scheduler);
}

bool MelonSQLiteScheduler::hasScheduler() const {
  std::lock_guard<std::mutex> lock(mutex_);
  return static_cast<bool>(scheduler_);
}

void MelonSQLiteScheduler::schedule(
    std::function<void(facebook::jsi::Runtime &)> work) {
  MelonJsScheduler schedulerCopy;
  {
    std::lock_guard<std::mutex> lock(mutex_);
    schedulerCopy = scheduler_;
  }
  if (!schedulerCopy) {
    return;
  }
  schedulerCopy(std::move(work));
}

} // namespace melon
