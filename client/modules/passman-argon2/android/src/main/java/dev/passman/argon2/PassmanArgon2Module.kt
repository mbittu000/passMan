package dev.passman.argon2

import android.util.Base64
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.bouncycastle.crypto.generators.Argon2BytesGenerator
import org.bouncycastle.crypto.params.Argon2Parameters

/**
 * Native Argon2id key derivation for passMan.
 *
 * Exposed to JS as `NativeModules.PassmanArgon2` with a single async function:
 *   derive(passwordBase64, saltBase64, memoryKiB, iterations, parallelism, dkLen)
 *     -> Promise<string> (base64 derived key)
 *
 * Uses Bouncy Castle's Argon2 implementation (Argon2id, version 1.3), matching
 * the parameters of the pure-JS fallback so both backends derive identical keys.
 */
class PassmanArgon2Module : Module() {
  override fun definition() = ModuleDefinition {
    Name("PassmanArgon2")

    AsyncFunction("derive") { passwordBase64: String, saltBase64: String, memoryKiB: Int, iterations: Int, parallelism: Int, dkLen: Int ->
      deriveArgon2id(passwordBase64, saltBase64, memoryKiB, iterations, parallelism, dkLen)
    }
  }

  private fun deriveArgon2id(
    passwordBase64: String,
    saltBase64: String,
    memoryKiB: Int,
    iterations: Int,
    parallelism: Int,
    dkLen: Int
  ): String {
    require(dkLen in 4..1024) { "dkLen must be between 4 and 1024" }
    require(memoryKiB >= 8) { "memoryKiB must be at least 8" }
    require(iterations >= 1) { "iterations must be at least 1" }
    require(parallelism >= 1) { "parallelism must be at least 1" }

    val password = Base64.decode(passwordBase64, Base64.NO_WRAP)
    val salt = Base64.decode(saltBase64, Base64.NO_WRAP)
    try {
      val parameters = Argon2Parameters.Builder(Argon2Parameters.ARGON2_id)
        .withVersion(Argon2Parameters.ARGON2_VERSION_13)
        .withIterations(iterations)
        .withMemoryAsKB(memoryKiB)
        .withParallelism(parallelism)
        .withSalt(salt)
        .build()
      val generator = Argon2BytesGenerator()
      generator.init(parameters)
      val out = ByteArray(dkLen)
      generator.generateBytes(password, out)
      return Base64.encodeToString(out, Base64.NO_WRAP)
    } finally {
      password.fill(0)
    }
  }
}