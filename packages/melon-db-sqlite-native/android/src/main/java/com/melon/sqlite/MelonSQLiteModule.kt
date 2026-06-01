package com.melon.sqlite

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray

/**
 * Android stub for Phase 20 spike — use @melon/db-sqlite/expo on Android until native support lands.
 */
class MelonSQLiteModule(reactContext: ReactApplicationContext) :
	ReactContextBaseJavaModule(reactContext) {
	override fun getName(): String = "MelonSQLite"

	private fun notImplemented(promise: Promise) {
		promise.reject(
			"NOT_IMPLEMENTED",
			"MelonSQLite Android is not implemented in this spike. Use @melon/db-sqlite/expo.",
		)
	}

	@ReactMethod
	fun open(
		@Suppress("UNUSED_PARAMETER") path: String,
		promise: Promise,
	) = notImplemented(promise)

	@ReactMethod
	fun close(promise: Promise) = notImplemented(promise)

	@ReactMethod
	fun exec(
		@Suppress("UNUSED_PARAMETER") sql: String,
		promise: Promise,
	) = notImplemented(promise)

	@ReactMethod
	fun queryAll(
		@Suppress("UNUSED_PARAMETER") sql: String,
		@Suppress("UNUSED_PARAMETER") params: ReadableArray,
		promise: Promise,
	) = notImplemented(promise)

	@ReactMethod
	fun queryFirst(
		@Suppress("UNUSED_PARAMETER") sql: String,
		@Suppress("UNUSED_PARAMETER") params: ReadableArray,
		promise: Promise,
	) = notImplemented(promise)

	@ReactMethod
	fun run(
		@Suppress("UNUSED_PARAMETER") sql: String,
		@Suppress("UNUSED_PARAMETER") params: ReadableArray,
		promise: Promise,
	) = notImplemented(promise)
}
