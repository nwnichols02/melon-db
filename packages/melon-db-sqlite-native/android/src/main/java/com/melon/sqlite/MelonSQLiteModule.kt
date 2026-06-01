package com.melon.sqlite

import android.database.Cursor
import android.database.sqlite.SQLiteDatabase
import com.facebook.fbreact.specs.NativeMelonSQLiteSpec
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableType
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.module.annotations.ReactModule
import java.io.File
import java.util.Locale
import java.util.concurrent.locks.ReentrantLock
import kotlin.concurrent.withLock

/**
 * Melon SQLite TurboModule for React Native development builds (Android).
 */
@ReactModule(name = NativeMelonSQLiteSpec.NAME)
class MelonSQLiteModule(reactContext: ReactApplicationContext) :
	NativeMelonSQLiteSpec(reactContext) {
	private val lock = ReentrantLock()
	private var database: SQLiteDatabase? = null

	private fun resolveDatabasePath(path: String): String {
		if (path.contains("..")) {
			throw IllegalArgumentException("Database path must not contain '..'")
		}
		if (path.startsWith("/")) {
			return path
		}
		val filesDir =
			reactApplicationContext.filesDir
				?: throw IllegalStateException("filesDir unavailable")
		return File(filesDir, path).absolutePath
	}

	private fun ensureOpen(promise: Promise): SQLiteDatabase? {
		val db = database
		if (db == null || !db.isOpen) {
			promise.reject("NOT_OPEN", "Database not open. Call open(path) first.")
			return null
		}
		return db
	}

	private fun bindArgs(params: ReadableArray): Array<String> {
		val args = arrayOfNulls<String>(params.size())
		for (i in 0 until params.size()) {
			when (params.getType(i)) {
				ReadableType.Null -> args[i] = null
				ReadableType.Boolean -> args[i] = if (params.getBoolean(i)) "1" else "0"
				ReadableType.Number -> {
					val value = params.getDouble(i)
					args[i] =
						if (value == value.toLong().toDouble()) {
							value.toLong().toString()
						} else {
							value.toString()
						}
				}
				ReadableType.String -> args[i] = params.getString(i)
				else ->
					throw IllegalArgumentException("Unsupported bind param at index $i")
			}
		}
		@Suppress("UNCHECKED_CAST")
		return args as Array<String>
	}

	/**
	 * Android [SQLiteDatabase.execSQL] rejects statements that return rows (SELECT, many PRAGMAs).
	 * Melon uses exec() for DDL and `PRAGMA journal_mode = WAL` during adapter init.
	 */
	private fun execSql(db: SQLiteDatabase, sql: String) {
		val trimmed = sql.trimStart().uppercase(Locale.US)
		if (trimmed.startsWith("SELECT") || trimmed.startsWith("PRAGMA")) {
			val cursor = db.rawQuery(sql, null)
			try {
				// Consume rows so PRAGMA side effects apply (e.g. journal_mode).
			} finally {
				cursor.close()
			}
			return
		}
		db.execSQL(sql)
	}

	private fun rowToMap(cursor: Cursor): WritableMap {
		val row = Arguments.createMap()
		for (i in 0 until cursor.columnCount) {
			val name = cursor.getColumnName(i)
			when (cursor.getType(i)) {
				Cursor.FIELD_TYPE_NULL -> row.putNull(name)
				Cursor.FIELD_TYPE_INTEGER -> row.putDouble(name, cursor.getLong(i).toDouble())
				Cursor.FIELD_TYPE_FLOAT -> row.putDouble(name, cursor.getDouble(i))
				Cursor.FIELD_TYPE_STRING -> row.putString(name, cursor.getString(i))
				Cursor.FIELD_TYPE_BLOB -> row.putNull(name)
				else -> row.putNull(name)
			}
		}
		return row
	}

	override fun open(path: String, promise: Promise) {
		lock.withLock {
			try {
				if (path.contains("..")) {
					promise.reject("INVALID_PATH", "Database path must not contain '..'")
					return
				}
				val resolved = resolveDatabasePath(path)
				database?.close()
				database = SQLiteDatabase.openOrCreateDatabase(resolved, null)
				promise.resolve(null)
			} catch (e: Exception) {
				database = null
				promise.reject("SQLITE_OPEN", e.message, e)
			}
		}
	}

	override fun close(promise: Promise) {
		lock.withLock {
			try {
				database?.close()
				database = null
				promise.resolve(null)
			} catch (e: Exception) {
				promise.reject("SQLITE_CLOSE", e.message, e)
			}
		}
	}

	override fun exec(sql: String, promise: Promise) {
		lock.withLock {
			val db = ensureOpen(promise) ?: return
			try {
				execSql(db, sql)
				promise.resolve(null)
			} catch (e: Exception) {
				promise.reject("SQLITE_EXEC", e.message, e)
			}
		}
	}

	override fun queryAll(sql: String, params: ReadableArray, promise: Promise) {
		lock.withLock {
			val db = ensureOpen(promise) ?: return
			var cursor: Cursor? = null
			try {
				val args = bindArgs(params)
				cursor = db.rawQuery(sql, args)
				val rows: WritableArray = Arguments.createArray()
				while (cursor.moveToNext()) {
					rows.pushMap(rowToMap(cursor))
				}
				promise.resolve(rows)
			} catch (e: Exception) {
				promise.reject("SQLITE_QUERY", e.message, e)
			} finally {
				cursor?.close()
			}
		}
	}

	override fun queryFirst(sql: String, params: ReadableArray, promise: Promise) {
		lock.withLock {
			val db = ensureOpen(promise) ?: return
			var cursor: Cursor? = null
			try {
				val args = bindArgs(params)
				cursor = db.rawQuery(sql, args)
				if (cursor.moveToFirst()) {
					promise.resolve(rowToMap(cursor))
				} else {
					promise.resolve(null)
				}
			} catch (e: Exception) {
				promise.reject("SQLITE_QUERY", e.message, e)
			} finally {
				cursor?.close()
			}
		}
	}

	override fun run(sql: String, params: ReadableArray, promise: Promise) {
		lock.withLock {
			val db = ensureOpen(promise) ?: return
			try {
				db.execSQL(sql, bindArgs(params))
				promise.resolve(null)
			} catch (e: Exception) {
				promise.reject("SQLITE_RUN", e.message, e)
			}
		}
	}
}
