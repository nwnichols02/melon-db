cmake_minimum_required(VERSION 3.13)
project(melon_sqlite)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_library(melon_sqlite SHARED
  ../cpp/MelonSQLiteHostObject.cpp
  ../cpp/MelonSQLiteInstaller.cpp
  src/main/jni/MelonSQLiteJni.cpp
  src/main/jni/OnLoad.cpp
)

find_package(ReactAndroid REQUIRED CONFIG)
find_package(fbjni REQUIRED CONFIG)

target_include_directories(melon_sqlite PRIVATE
  ../cpp
  src/main/jni
)

if(DEFINED SQLITE3_SRC_DIR AND EXISTS "${SQLITE3_SRC_DIR}/sqlite3.c")
  target_sources(melon_sqlite PRIVATE "${SQLITE3_SRC_DIR}/sqlite3.c")
  target_include_directories(melon_sqlite PRIVATE "${SQLITE3_SRC_DIR}")
  if(DEFINED SQLITE_BUILDFLAGS)
    separate_arguments(SQLITE_BUILDFLAGS)
    target_compile_options(melon_sqlite PRIVATE ${SQLITE_BUILDFLAGS})
  endif()
else()
  find_library(SQLITE_LIB sqlite)
  if(SQLITE_LIB)
    target_link_libraries(melon_sqlite ${SQLITE_LIB})
  else()
    message(FATAL_ERROR
      "sqlite3 not found. Set -DSQLITE3_SRC_DIR=... to expo-sqlite/vendor/sqlite3 or vendor/sqlite3.")
  endif()
endif()

target_link_libraries(melon_sqlite
  android
  log
  ReactAndroid::jsi
  fbjni::fbjni
)

if(ReactAndroid_VERSION_MINOR GREATER_EQUAL 76)
  target_link_libraries(melon_sqlite ReactAndroid::reactnative)
else()
  target_link_libraries(melon_sqlite ReactAndroid::reactnativejni)
endif()
