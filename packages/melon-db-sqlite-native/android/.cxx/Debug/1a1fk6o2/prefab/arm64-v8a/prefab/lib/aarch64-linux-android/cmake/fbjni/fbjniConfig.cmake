if(NOT TARGET fbjni::fbjni)
add_library(fbjni::fbjni SHARED IMPORTED)
set_target_properties(fbjni::fbjni PROPERTIES
    IMPORTED_LOCATION "/private/var/folders/30/x87gqjgd7jq7k47p0n0l7rq00000gp/T/cursor-sandbox-cache/2b4429f21822aeadab4e2b55cfeed481/gradle/caches/8.14.3/transforms/6347936a505aab872d9b18fa868e791d/transformed/fbjni-0.7.0/prefab/modules/fbjni/libs/android.arm64-v8a/libfbjni.so"
    INTERFACE_INCLUDE_DIRECTORIES "/private/var/folders/30/x87gqjgd7jq7k47p0n0l7rq00000gp/T/cursor-sandbox-cache/2b4429f21822aeadab4e2b55cfeed481/gradle/caches/8.14.3/transforms/6347936a505aab872d9b18fa868e791d/transformed/fbjni-0.7.0/prefab/modules/fbjni/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

