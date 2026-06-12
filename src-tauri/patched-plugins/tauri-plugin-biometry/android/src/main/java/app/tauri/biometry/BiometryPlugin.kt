package app.tauri.biometry

import android.app.Activity
import android.content.Context
import android.content.SharedPreferences
import android.os.Build
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import app.tauri.annotation.Command
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import java.security.KeyStore
import java.util.Base64
import java.util.concurrent.Executors
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.spec.GCMParameterSpec

@TauriPlugin
class BiometryPlugin(activity: Activity) : Plugin(activity) {

    private val prefsName = "biometry_secure_store"
    private val keyStoreType = "AndroidKeyStore"
    private val gcmTagLength = 128

    private var activityRef: FragmentActivity? = null

    init {
        if (activity is FragmentActivity) {
            activityRef = activity
        }
    }

    private fun getPrefs(): SharedPreferences? {
        val act = activityRef ?: return null
        return act.getSharedPreferences(prefsName, Context.MODE_PRIVATE)
    }

    private fun getKeyStoreKey(alias: String): javax.crypto.SecretKey? {
        return try {
            val keyStore = KeyStore.getInstance(keyStoreType)
            keyStore.load(null)
            keyStore.getKey(alias, null) as? javax.crypto.SecretKey
        } catch (e: Exception) {
            null
        }
    }

    private fun createOrGetKey(alias: String): javax.crypto.SecretKey {
        val existing = getKeyStoreKey(alias)
        if (existing != null) return existing

        val keyGenerator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, keyStoreType)
        val specBuilder = KeyGenParameterSpec.Builder(
            alias,
            KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
        )
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(256)
            .setUserAuthenticationRequired(true)
            .setUserAuthenticationValidityDurationSeconds(5)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            specBuilder.setUnlockedDeviceRequired(false)
        }

        keyGenerator.init(specBuilder.build())
        return keyGenerator.generateKey()
    }

    private fun deleteKey(alias: String) {
        try {
            val keyStore = KeyStore.getInstance(keyStoreType)
            keyStore.load(null)
            keyStore.deleteEntry(alias)
        } catch (_: Exception) {
        }
    }

    private fun encryptWithCipher(cipher: Cipher, data: String): String {
        val encrypted = cipher.doFinal(data.toByteArray(Charsets.UTF_8))
        val iv = cipher.iv
        val combined = ByteArray(iv.size + encrypted.size)
        System.arraycopy(iv, 0, combined, 0, iv.size)
        System.arraycopy(encrypted, 0, combined, iv.size, encrypted.size)
        return Base64.getEncoder().encodeToString(combined)
    }

    private fun decryptWithCipher(cipher: Cipher, encryptedData: String): String {
        val combined = Base64.getDecoder().decode(encryptedData)
        val decrypted = cipher.doFinal(combined)
        return String(decrypted, Charsets.UTF_8)
    }

    private fun buildPromptInfo(
        title: String,
        subtitle: String? = null,
        allowDeviceCredential: Boolean = false
    ): BiometricPrompt.PromptInfo {
        val builder = BiometricPrompt.PromptInfo.Builder()
            .setTitle(title)

        if (subtitle != null) {
            builder.setSubtitle(subtitle)
        }

        if (allowDeviceCredential && Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            builder.setAllowedAuthenticators(
                BiometricManager.Authenticators.BIOMETRIC_STRONG or
                        BiometricManager.Authenticators.DEVICE_CREDENTIAL
            )
        } else {
            builder.setNegativeButtonText("Cancel")
        }

        return builder.build()
    }

    @Command
    fun status(invoke: Invoke) {
        val act = activityRef
        if (act == null) {
            val result = JSObject()
            result.put("isAvailable", false)
            result.put("biometryType", 0)
            result.put("error", "No activity available")
            result.put("errorCode", "internalError")
            invoke.resolve(result)
            return
        }

        val biometricManager = BiometricManager.from(act)
        val result = JSObject()

        when (biometricManager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG)) {
            BiometricManager.BIOMETRIC_SUCCESS -> {
                result.put("isAvailable", true)
                result.put("biometryType", 1) 
            }
            BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE -> {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R &&
                    biometricManager.canAuthenticate(BiometricManager.Authenticators.DEVICE_CREDENTIAL) ==
                    BiometricManager.BIOMETRIC_SUCCESS
                ) {
                    result.put("isAvailable", true)
                    result.put("biometryType", 2) 
                } else {
                    result.put("isAvailable", false)
                    result.put("biometryType", 0)
                    result.put("error", "No biometric hardware available")
                    result.put("errorCode", "biometryNotAvailable")
                }
            }
            BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED -> {
                result.put("isAvailable", false)
                result.put("biometryType", 0)
                result.put("error", "No biometric enrolled")
                result.put("errorCode", "biometryNotEnrolled")
            }
            BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE -> {
                result.put("isAvailable", false)
                result.put("biometryType", 0)
                result.put("error", "Biometric hardware unavailable")
                result.put("errorCode", "biometryNotAvailable")
            }
            else -> {
                result.put("isAvailable", false)
                result.put("biometryType", 0)
                result.put("error", "Unknown biometric status")
                result.put("errorCode", "biometryNotAvailable")
            }
        }

        invoke.resolve(result)
    }

    @Command
    fun authenticate(invoke: Invoke) {
        val act = activityRef
        if (act == null) {
            invoke.reject("noActivity", "No activity available")
            return
        }

        val args = invoke.getArgs()
        val reason = args.optString("reason", "Authenticate")
        val allowDeviceCredential = args.optBoolean("allowDeviceCredential", false)
        val cancelTitle = args.optString("cancelTitle", "Cancel")

        val executor = ContextCompat.getMainExecutor(act)

        val callback = object : BiometricPrompt.AuthenticationCallback() {
            override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                invoke.resolve(JSObject())
            }

            override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                val code = when (errorCode) {
                    BiometricPrompt.ERROR_USER_CANCELED -> "userCancel"
                    BiometricPrompt.ERROR_CANCELED -> "systemCancel"
                    BiometricPrompt.ERROR_LOCKOUT -> "biometryLockout"
                    BiometricPrompt.ERROR_LOCKOUT_PERMANENT -> "biometryLockout"
                    BiometricPrompt.ERROR_NO_BIOMETRICS -> "biometryNotEnrolled"
                    BiometricPrompt.ERROR_HW_NOT_PRESENT -> "biometryNotAvailable"
                    BiometricPrompt.ERROR_HW_UNAVAILABLE -> "biometryNotAvailable"
                    else -> "authenticationFailed"
                }
                invoke.reject(code, errString.toString())
            }

            override fun onAuthenticationFailed() {
            }
        }

        val prompt = BiometricPrompt(act, executor, callback)

        val promptInfoBuilder = BiometricPrompt.PromptInfo.Builder()
            .setTitle(reason)
            .setNegativeButtonText(cancelTitle)

        if (allowDeviceCredential && Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            promptInfoBuilder.setAllowedAuthenticators(
                BiometricManager.Authenticators.BIOMETRIC_STRONG or
                        BiometricManager.Authenticators.DEVICE_CREDENTIAL
            )
        }

        prompt.authenticate(promptInfoBuilder.build())
    }

    @Command
    fun hasData(invoke: Invoke) {
        val prefs = getPrefs()
        if (prefs == null) {
            val result = JSObject()
            result.put("has_data", false)
            invoke.resolve(result)
            return
        }

        val args = invoke.getArgs()
        val domain = args.optString("domain", "")
        val name = args.optString("name", "")
        val key = "${domain}:${name}"

        val result = JSObject()
        result.put("has_data", prefs.contains(key))
        invoke.resolve(result)
    }

    @Command
    fun setData(invoke: Invoke) {
        val act = activityRef
        val prefs = getPrefs()
        if (act == null || prefs == null) {
            invoke.reject("noActivity", "Activity or storage not available")
            return
        }

        val args = invoke.getArgs()
        val domain = args.optString("domain", "")
        val name = args.optString("name", "")
        val data = args.optString("data", "")

        if (domain.isEmpty() || name.isEmpty()) {
            invoke.reject("invalidInput", "Domain and name must not be empty")
            return
        }

        val alias = "biometry_${domain}_${name}"
        val key = "${domain}:${name}"

        try {
            val secretKey = createOrGetKey(alias)
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(Cipher.ENCRYPT_MODE, secretKey)

            val executor = ContextCompat.getMainExecutor(act)
            val cryptoObject = BiometricPrompt.CryptoObject(cipher)

            val callback = object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                    try {
                        val resultCipher = result.cryptoObject?.cipher ?: cipher
                        val encryptedData = encryptWithCipher(resultCipher, data)
                        prefs.edit().putString(key, encryptedData).apply()
                        invoke.resolve(JSObject())
                    } catch (e: Exception) {
                        invoke.reject("encryptionFailed", e.message ?: "Encryption failed")
                    }
                }

                override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                    val code = when (errorCode) {
                        BiometricPrompt.ERROR_USER_CANCELED -> "userCancel"
                        BiometricPrompt.ERROR_CANCELED -> "systemCancel"
                        BiometricPrompt.ERROR_LOCKOUT -> "biometryLockout"
                        BiometricPrompt.ERROR_LOCKOUT_PERMANENT -> "biometryLockout"
                        else -> "authenticationFailed"
                    }
                    invoke.reject(code, errString.toString())
                }

                override fun onAuthenticationFailed() {
                }
            }

            val prompt = BiometricPrompt(act, executor, callback)
            prompt.authenticate(
                buildPromptInfo(
                    title = "Save to vault",
                    subtitle = "Authenticate to securely store your data",
                    allowDeviceCredential = true
                ),
                cryptoObject
            )
        } catch (e: Exception) {
            invoke.reject("keyError", e.message ?: "Failed to create key")
        }
    }

    @Command
    fun getData(invoke: Invoke) {
        val act = activityRef
        val prefs = getPrefs()
        if (act == null || prefs == null) {
            invoke.reject("noActivity", "Activity or storage not available")
            return
        }

        val args = invoke.getArgs()
        val domain = args.optString("domain", "")
        val name = args.optString("name", "")
        val reason = args.optString("reason", "Authenticate to access your data")

        if (domain.isEmpty() || name.isEmpty()) {
            invoke.reject("invalidInput", "Domain and name must not be empty")
            return
        }

        val alias = "biometry_${domain}_${name}"
        val prefsKey = "${domain}:${name}"

        val encryptedData = prefs.getString(prefsKey, null)
        if (encryptedData == null) {
            invoke.reject("dataNotFound", "No data found for this key")
            return
        }

        try {
            val secretKey = getKeyStoreKey(alias)
            if (secretKey == null) {
                invoke.reject("keyNotFound", "Biometric key not found")
                return
            }

            val decryptCipher = Cipher.getInstance("AES/GCM/NoPadding")
            val combined = Base64.getDecoder().decode(encryptedData)
            val iv = combined.copyOfRange(0, 12)
            val encrypted = combined.copyOfRange(12, combined.size)
            decryptCipher.init(Cipher.DECRYPT_MODE, secretKey, GCMParameterSpec(gcmTagLength, iv))

            val executor = ContextCompat.getMainExecutor(act)
            val cryptoObject = BiometricPrompt.CryptoObject(decryptCipher)

            val callback = object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                    try {
                        val resultCipher = result.cryptoObject?.cipher ?: decryptCipher
                        val decrypted = resultCipher.doFinal(encrypted)
                        val dataStr = String(decrypted, Charsets.UTF_8)

                        val response = JSObject()
                        response.put("domain", domain)
                        response.put("name", name)
                        response.put("data", dataStr)
                        invoke.resolve(response)
                    } catch (e: Exception) {
                        invoke.reject("decryptionFailed", e.message ?: "Decryption failed")
                    }
                }

                override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                    val code = when (errorCode) {
                        BiometricPrompt.ERROR_USER_CANCELED -> "userCancel"
                        BiometricPrompt.ERROR_CANCELED -> "systemCancel"
                        BiometricPrompt.ERROR_LOCKOUT -> "biometryLockout"
                        BiometricPrompt.ERROR_LOCKOUT_PERMANENT -> "biometryLockout"
                        else -> "authenticationFailed"
                    }
                    invoke.reject(code, errString.toString())
                }

                override fun onAuthenticationFailed() {
                }
            }

            val prompt = BiometricPrompt(act, executor, callback)
            prompt.authenticate(
                buildPromptInfo(
                    title = reason,
                    subtitle = "Authenticate to access your encrypted data",
                    allowDeviceCredential = true
                ),
                cryptoObject
            )
        } catch (e: Exception) {
            invoke.reject("keyError", e.message ?: "Failed to access key")
        }
    }

    @Command
    fun removeData(invoke: Invoke) {
        val prefs = getPrefs()
        if (prefs == null) {
            invoke.resolve(JSObject())
            return
        }

        val args = invoke.getArgs()
        val domain = args.optString("domain", "")
        val name = args.optString("name", "")
        val key = "${domain}:${name}"
        val alias = "biometry_${domain}_${name}"

        prefs.edit().remove(key).apply()
        deleteKey(alias)

        invoke.resolve(JSObject())
    }
}
