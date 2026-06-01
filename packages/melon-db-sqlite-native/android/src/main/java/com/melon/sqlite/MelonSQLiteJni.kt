package com.melon.sqlite

import com.facebook.proguard.annotations.DoNotStrip
import com.facebook.react.bridge.RuntimeExecutor

/**
 * JNI bridge that installs global.melonSqliteJsi via RuntimeExecutor (Android dev build).
 */
@DoNotStrip
object MelonSQLiteJni {
	init {
		System.loadLibrary("melon_sqlite")
	}

	@JvmStatic
	external fun install(runtimeExecutor: RuntimeExecutor)
}
