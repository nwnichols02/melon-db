package com.melon.sqlite

import com.facebook.fbreact.specs.NativeMelonSQLiteSpec
import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class MelonSQLitePackage : BaseReactPackage() {
	override fun getModule(
		name: String,
		reactContext: ReactApplicationContext,
	): NativeModule? =
		if (name == NativeMelonSQLiteSpec.NAME) {
			MelonSQLiteModule(reactContext)
		} else {
			null
		}

	override fun getReactModuleInfoProvider(): ReactModuleInfoProvider =
		ReactModuleInfoProvider {
			mapOf(
				NativeMelonSQLiteSpec.NAME to
					ReactModuleInfo(
						NativeMelonSQLiteSpec.NAME,
						MelonSQLiteModule::class.java.name,
						false,
						false,
						false,
						BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
					),
			)
		}
}
