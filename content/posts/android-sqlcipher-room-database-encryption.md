---
title: "SQLCipher로 Room SQLite DB 암호화하기"
date: "2026-06-11"
category: "Android"
group: "Android Security"
series: "Android Security"
tags: ["android", "sqlcipher", "sqlite", "room", "keystore", "database", "encryption"]
description: "SQLCipher로 Room SQLite DB 파일을 암호화하는 기본 흐름과, DB passphrase를 Android Keystore로 보호하는 간단한 예제 코드를 정리합니다."
---

![SQLCipher로 DB 파일 암호화](/images/android-sqlcipher-room-cover.png)

Android 앱에서 로컬 DB를 다루다 보면 `Room`과 `SQLite`를 함께 보게 된다. Room은 SQLite 위에 타입 안정성과 DAO 추상화를 얹어주는 라이브러리이고, 앱 코드에서는 보통 Entity와 DAO 중심으로 데이터를 읽고 쓴다.

그런데 기본 SQLite DB 파일은 암호화된 파일이 아니다. 앱의 DB 파일을 누군가 꺼내갈 수 있는 상황을 가정하면, 일반 SQLite 도구로 테이블 구조나 데이터를 볼 수 있다.

이때 검토할 수 있는 선택지 중 하나가 SQLCipher다.

```text
SQLCipher는 SQLite DB 파일 자체를 암호화해서,
키 없이 DB 파일만 열었을 때 내용을 읽기 어렵게 만드는 라이브러리다.
```

이 글에서는 SQLCipher를 Room과 연결하는 간단한 Android 예제와, DB 암호화에 쓰는 passphrase를 어떤 식으로 보호할 수 있는지 살펴본다.

## 일반 SQLite와 SQLCipher의 차이

일반 SQLite 파일은 DB 파일만 있으면 `sqlite3` 같은 도구로 내용을 확인할 수 있다.

```bash
sqlite3 app.db
.tables
```

반면 SQLCipher로 암호화된 DB 파일은 키 없이 열면 일반 SQLite 파일처럼 읽히지 않는다. 상황에 따라 `file is not a database`처럼 보일 수 있고, 테이블 조회도 되지 않는다.

![일반 SQLite와 SQLCipher 비교](/images/android-sqlcipher-sqlite-comparison-handdrawn.png)

차이는 단순하다.

```text
일반 SQLite
= DB 파일에 SQLite 데이터가 그대로 저장된다.

SQLCipher
= DB 파일이 암호화된 형태로 저장된다.
```

앱 안에서는 SQLCipher가 passphrase를 사용해 DB를 열어주기 때문에 기존 Room/DAO 코드와 비슷한 방식으로 데이터를 다룰 수 있다. 하지만 디스크에 남는 DB 파일은 암호화된 상태다.

## 전체 흐름

Room과 SQLCipher를 함께 쓰는 흐름은 다음과 같다.

![Room이 SQLCipher로 암호화된 SQLite DB를 여는 흐름](/images/android-sqlcipher-room-open-flow-handdrawn.png)

순서대로 보면 다음과 같다.

```text
앱이 DB를 열려고 한다.
-> DB passphrase를 준비한다.
-> SQLCipher SupportOpenHelperFactory에 passphrase를 전달한다.
-> Room.databaseBuilder에 openHelperFactory를 연결한다.
-> Room/DAO는 일반 Room 쿼리처럼 데이터를 읽고 쓴다.
-> 디스크에는 암호화된 DB 파일이 남는다.
```

Room 설정에서 핵심은 `openHelperFactory()`다.

Room 코드에서 SQLCipher를 직접 열기보다, `SupportOpenHelperFactory`를 통해 암호화된 SQLite open helper를 연결한다.

```kotlin
Room.databaseBuilder(
    context,
    AppDatabase::class.java,
    "sample.db"
)
    .openHelperFactory(factory)
    .build()
```

여기서 `factory`가 SQLCipher가 제공하는 `SupportOpenHelperFactory` 인스턴스다.

## 예제 의존성

이 예제는 `net.zetetic:sqlcipher-android`의 `SupportOpenHelperFactory`를 기준으로 작성했다.

예전 자료에서는 `net.sqlcipher:android-database-sqlcipher`와 `SupportFactory`를 쓰는 예제가 보일 수 있다. 이 글에서는 현재 SQLCipher for Android README에서 안내하는 `sqlcipher-android` 흐름을 기준으로 본다.

예를 들면 `app/build.gradle.kts`에 아래 의존성을 추가한다.

```kotlin
plugins {
    id("com.android.application")
    kotlin("android")
    id("com.google.devtools.ksp")
}

android {
    namespace = "com.example.encrypteddb"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.example.encrypteddb"
        minSdk = 23
        targetSdk = 36
        versionCode = 1
        versionName = "1.0"
    }
}

dependencies {
    val roomVersion = "2.8.3"

    implementation("androidx.room:room-runtime:$roomVersion")
    implementation("androidx.room:room-ktx:$roomVersion")
    ksp("androidx.room:room-compiler:$roomVersion")

    implementation("net.zetetic:sqlcipher-android:4.16.0@aar")
    implementation("androidx.sqlite:sqlite:2.6.2")
}
```

버전은 글 작성 시점의 예시다. 실제 프로젝트에서는 Room, AndroidX SQLite, SQLCipher 릴리즈 호환성을 확인하고 맞춰야 한다.

## Room Entity와 DAO

먼저 Room 모델부터 만든다. SQLCipher를 붙여도 Entity와 DAO 작성 방식은 크게 달라지지 않는다.

`SecureNoteEntity.kt`

```kotlin
package com.example.encrypteddb.data

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "secure_notes")
data class SecureNoteEntity(
    @PrimaryKey(autoGenerate = true)
    @ColumnInfo(name = "id")
    val id: Long = 0L,

    @ColumnInfo(name = "title")
    val title: String,

    @ColumnInfo(name = "body")
    val body: String,

    @ColumnInfo(name = "created_at")
    val createdAt: Long
)
```

`SecureNoteDao.kt`

```kotlin
package com.example.encrypteddb.data

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface SecureNoteDao {
    @Query("SELECT * FROM secure_notes ORDER BY created_at DESC")
    fun observeAll(): Flow<List<SecureNoteEntity>>

    @Query("SELECT * FROM secure_notes WHERE id = :id LIMIT 1")
    suspend fun findById(id: Long): SecureNoteEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(note: SecureNoteEntity): Long

    @Query("DELETE FROM secure_notes WHERE id = :id")
    suspend fun deleteById(id: Long)
}
```

`AppDatabase.kt`

```kotlin
package com.example.encrypteddb.data

import androidx.room.Database
import androidx.room.RoomDatabase

@Database(
    entities = [
        SecureNoteEntity::class
    ],
    version = 1,
    exportSchema = true
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun secureNoteDao(): SecureNoteDao
}
```

여기까지는 일반 Room DB와 다르지 않다. 차이는 DB를 만드는 코드에서 생긴다.

## 가장 단순한 SQLCipher 연결 코드

연결 구조만 보면 아래처럼 쓸 수 있다.

```kotlin
package com.example.encrypteddb.data

import android.content.Context
import androidx.room.Room
import net.zetetic.database.sqlcipher.SupportOpenHelperFactory
import java.nio.charset.StandardCharsets

object SimpleEncryptedDatabaseProvider {
    fun create(context: Context): AppDatabase {
        System.loadLibrary("sqlcipher")

        val passphrase = "do-not-hardcode-this-value"
            .toByteArray(StandardCharsets.UTF_8)

        val factory = SupportOpenHelperFactory(passphrase)

        return Room.databaseBuilder(
            context.applicationContext,
            AppDatabase::class.java,
            "sample-encrypted.db"
        )
            .openHelperFactory(factory)
            .build()
    }
}
```

다만 이 코드는 연결 구조를 보여주는 예시일 뿐이다. 실제 코드에서는 이렇게 쓰면 안 된다.

```text
passphrase를 코드에 하드코딩했기 때문이다.
```

SQLCipher를 붙일 때 바로 확인해야 할 부분은 "DB를 여는 passphrase를 어디에 보관하느냐"다.

코드나 리소스에 `"do-not-hardcode-this-value"` 같은 값을 넣으면 APK 분석으로 노출될 수 있다. 그러면 DB 파일을 암호화해도 공격자가 같은 passphrase를 찾을 수 있다.

그래서 실제 구조에서는 passphrase를 랜덤으로 만들고, 그 passphrase를 다시 Android Keystore 키로 보호해서 저장하는 식으로 설계한다.

## passphrase 저장 흐름

SQLCipher DB를 열려면 passphrase가 필요하다. 이 passphrase는 DB 파일을 여는 열쇠다.

다만 이 열쇠를 그대로 저장하면 안 된다.

![SQLCipher DB passphrase를 Keystore로 보호하는 흐름](/images/android-sqlcipher-passphrase-keystore-flow-handdrawn.png)

저장과 복원 흐름을 나누면 다음과 같다.

```text
최초 실행
-> SecureRandom으로 DB passphrase 생성
-> Android Keystore AES 키로 passphrase 암호화
-> 암호화된 passphrase를 SharedPreferences 또는 DataStore에 저장

앱 시작
-> 암호화된 passphrase 읽기
-> Android Keystore AES 키로 복호화
-> 원본 passphrase를 SQLCipher에 전달
-> Room DB open
```

여기서 SharedPreferences나 DataStore에는 원본 passphrase가 아니라, Keystore 키로 암호화된 passphrase가 저장된다.

```text
저장소에 남는 것
= 암호화된 passphrase

저장소에 남기지 않는 것
= 원본 DB passphrase
```

## Keystore로 passphrase 감싸기

다음 코드는 Android Keystore의 AES-GCM 키로 DB passphrase를 암호화하고 복호화하는 간단한 helper다.

`DbPassphraseCrypto.kt`

```kotlin
package com.example.encrypteddb.security

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

data class EncryptedBytes(
    val iv: ByteArray,
    val ciphertext: ByteArray
)

class DbPassphraseCrypto {
    private val keyStore: KeyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply {
        load(null)
    }

    fun encrypt(plaintext: ByteArray): EncryptedBytes {
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.ENCRYPT_MODE, getOrCreateSecretKey())

        val ciphertext = cipher.doFinal(plaintext)
        val iv = cipher.iv

        return EncryptedBytes(
            iv = iv,
            ciphertext = ciphertext
        )
    }

    fun decrypt(encryptedBytes: EncryptedBytes): ByteArray {
        val cipher = Cipher.getInstance(TRANSFORMATION)
        val gcmParameterSpec = GCMParameterSpec(
            GCM_TAG_LENGTH_BITS,
            encryptedBytes.iv
        )

        cipher.init(
            Cipher.DECRYPT_MODE,
            getOrCreateSecretKey(),
            gcmParameterSpec
        )

        return cipher.doFinal(encryptedBytes.ciphertext)
    }

    private fun getOrCreateSecretKey(): SecretKey {
        val existingKey = keyStore.getKey(KEY_ALIAS, null) as? SecretKey
        if (existingKey != null) {
            return existingKey
        }

        val keyGenerator = KeyGenerator.getInstance(
            KeyProperties.KEY_ALGORITHM_AES,
            ANDROID_KEYSTORE
        )

        val keySpec = KeyGenParameterSpec.Builder(
            KEY_ALIAS,
            KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
        )
            .setKeySize(256)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .build()

        keyGenerator.init(keySpec)
        return keyGenerator.generateKey()
    }

    companion object {
        private const val ANDROID_KEYSTORE = "AndroidKeyStore"
        private const val KEY_ALIAS = "sample_sqlcipher_db_passphrase_key"
        private const val TRANSFORMATION = "AES/GCM/NoPadding"
        private const val GCM_TAG_LENGTH_BITS = 128
    }
}
```

여기서 Keystore 키는 alias로 관리된다.

앱이 키 원본 바이트를 직접 꺼내는 구조가 아니라, `SecretKey`를 통해 암호화/복호화 연산에 사용한다.

## 암호화된 passphrase 저장소

이제 passphrase를 랜덤으로 생성하고, 암호화된 결과를 저장하는 클래스를 만든다.

예제에서는 이해를 위해 `SharedPreferences`를 쓴다. 여기서 핵심은 SharedPreferences에 원본 passphrase를 저장하지 않는다는 것이다.

`DbPassphraseStore.kt`

```kotlin
package com.example.encrypteddb.security

import android.content.Context
import android.util.Base64
import java.security.SecureRandom

class DbPassphraseStore(
    context: Context,
    private val crypto: DbPassphraseCrypto = DbPassphraseCrypto()
) {
    private val preferences = context.applicationContext.getSharedPreferences(
        PREFS_NAME,
        Context.MODE_PRIVATE
    )

    fun getOrCreatePassphrase(): ByteArray {
        val savedIv = preferences.getString(KEY_IV, null)
        val savedCiphertext = preferences.getString(KEY_CIPHERTEXT, null)

        if (savedIv != null && savedCiphertext != null) {
            return crypto.decrypt(
                EncryptedBytes(
                    iv = savedIv.fromBase64(),
                    ciphertext = savedCiphertext.fromBase64()
                )
            )
        }

        val passphrase = generatePassphrase()
        val encrypted = crypto.encrypt(passphrase)

        preferences.edit()
            .putString(KEY_IV, encrypted.iv.toBase64())
            .putString(KEY_CIPHERTEXT, encrypted.ciphertext.toBase64())
            .apply()

        return passphrase
    }

    private fun generatePassphrase(): ByteArray {
        return ByteArray(PASSPHRASE_LENGTH_BYTES).also { bytes ->
            secureRandom.nextBytes(bytes)
        }
    }

    private fun ByteArray.toBase64(): String {
        return Base64.encodeToString(this, Base64.NO_WRAP)
    }

    private fun String.fromBase64(): ByteArray {
        return Base64.decode(this, Base64.NO_WRAP)
    }

    companion object {
        private const val PREFS_NAME = "encrypted_db_passphrase"
        private const val KEY_IV = "iv"
        private const val KEY_CIPHERTEXT = "ciphertext"
        private const val PASSPHRASE_LENGTH_BYTES = 32

        private val secureRandom = SecureRandom()
    }
}
```

이제 최초 실행 시점에는 랜덤 passphrase가 만들어지고, Keystore 키로 암호화된 뒤 저장된다.

다음 실행부터는 저장된 암호화 passphrase를 읽고, Keystore 키로 복호화해서 SQLCipher에 넘긴다.

## Room DB 생성 코드

이제 Room DB를 생성하는 provider에서 SQLCipher를 연결한다.

`EncryptedDatabaseProvider.kt`

```kotlin
package com.example.encrypteddb.data

import android.content.Context
import androidx.room.Room
import com.example.encrypteddb.security.DbPassphraseStore
import net.zetetic.database.sqlcipher.SupportOpenHelperFactory

object EncryptedDatabaseProvider {
    @Volatile
    private var instance: AppDatabase? = null

    fun getInstance(context: Context): AppDatabase {
        return instance ?: synchronized(this) {
            instance ?: createDatabase(context.applicationContext).also { database ->
                instance = database
            }
        }
    }

    private fun createDatabase(context: Context): AppDatabase {
        loadSqlCipher()

        val passphrase = DbPassphraseStore(context).getOrCreatePassphrase()
        val factory = SupportOpenHelperFactory(passphrase)

        return Room.databaseBuilder(
            context,
            AppDatabase::class.java,
            DATABASE_NAME
        )
            .openHelperFactory(factory)
            .build()
    }

    private fun loadSqlCipher() {
        if (sqlCipherLoaded) {
            return
        }

        synchronized(this) {
            if (!sqlCipherLoaded) {
                System.loadLibrary("sqlcipher")
                sqlCipherLoaded = true
            }
        }
    }

    private const val DATABASE_NAME = "sample-encrypted.db"

    @Volatile
    private var sqlCipherLoaded: Boolean = false
}
```

`System.loadLibrary("sqlcipher")`는 SQLCipher 네이티브 라이브러리를 로드하는 단계다. SQLCipher for Android README에서도 SQLCipher 기능을 쓰기 전에 네이티브 SQLCipher core 라이브러리를 명시적으로 로드하는 예시를 보여준다.

`SupportOpenHelperFactory(passphrase)`는 Room이 DB를 열 때 SQLCipher helper를 사용하게 해준다.

```kotlin
.openHelperFactory(factory)
```

이 설정을 통해 Room은 SQLCipher open helper를 사용해 암호화된 SQLite 파일을 연다.

## 실제 사용 예시

Repository에서는 일반 Room DB처럼 DAO를 쓰면 된다.

`SecureNoteRepository.kt`

```kotlin
package com.example.encrypteddb.data

import android.content.Context
import kotlinx.coroutines.flow.Flow

class SecureNoteRepository(
    context: Context
) {
    private val database = EncryptedDatabaseProvider.getInstance(context)
    private val dao = database.secureNoteDao()

    fun observeNotes(): Flow<List<SecureNoteEntity>> {
        return dao.observeAll()
    }

    suspend fun createNote(
        title: String,
        body: String
    ): Long {
        return dao.insert(
            SecureNoteEntity(
                title = title,
                body = body,
                createdAt = System.currentTimeMillis()
            )
        )
    }

    suspend fun findNote(id: Long): SecureNoteEntity? {
        return dao.findById(id)
    }

    suspend fun deleteNote(id: Long) {
        dao.deleteById(id)
    }
}
```

사용하는 쪽에서는 SQLCipher를 매번 의식하지 않는다.

```kotlin
val repository = SecureNoteRepository(context)

val newId = repository.createNote(
    title = "local encrypted db",
    body = "stored inside an encrypted SQLite file"
)

val note = repository.findNote(newId)
```

DB가 열린 뒤에는 Room/DAO 사용 방식이 크게 달라지지 않는다. SQLCipher는 DB 파일을 열고 저장하는 하위 계층에서 동작한다.

## 이 예제가 보호하는 것

이 구조가 보호하는 것은 DB 파일 자체다.

```text
누군가 sample-encrypted.db 파일만 가져간다.
-> passphrase가 없으면 일반 sqlite3로 내용을 보기 어렵다.
```

도움이 되는 상황은 이런 쪽이다.

- DB 파일이 외부로 복사되는 경우
- 백업 파일이나 로컬 파일 접근으로 DB가 노출되는 경우
- 일반 SQLite 도구로 DB 내용을 바로 열어보려는 경우

하지만 SQLCipher를 쓴다고 모든 문제가 사라지는 것은 아니다.

```text
앱이 DB를 열고 있는 순간에는 평문 row가 메모리에 올라올 수 있다.
로그에 민감값을 찍으면 그대로 노출된다.
DB passphrase 관리가 약하면 DB 암호화도 약해진다.
루팅/디버깅/메모리 공격까지 완전히 막아주는 것은 아니다.
```

그래서 SQLCipher는 저장 파일을 보호하는 계층으로 이해하는 것이 정확하다.

```text
SQLCipher
= 디스크에 남는 SQLite DB 파일을 암호화한다.

Android Keystore
= DB passphrase를 보호하는 키를 관리한다.

앱 코드
= 평문을 언제 읽고, 어디까지 전달하고, 로그에 남기지 않을지 관리한다.
```

## passphrase를 잃어버리면 어떻게 될까

DB passphrase는 암호화된 DB 파일을 여는 열쇠다.

그래서 passphrase를 잃어버리면 기존 DB를 열 수 없다.

예를 들어 앱 삭제/재설치, 백업 복원, Keystore 키 삭제 같은 상황을 고려해야 한다.

```text
암호화된 DB 파일은 남아 있다.
하지만 Keystore 키가 사라졌다.
암호화된 passphrase를 복호화할 수 없다.
DB를 열 수 없다.
```

이건 버그라기보다 암호화 저장소의 자연스러운 성질이다. 키가 없는데 데이터를 열 수 있다면 암호화의 의미가 약해진다.

그래서 앱 정책을 미리 정해두는 편이 좋다.

```text
복구 불가능한 로컬 캐시인가?
-> DB 삭제 후 재동기화할 수 있다.

사용자에게 중요한 로컬 데이터인가?
-> 별도 백업/복구 정책이 필요하다.

사용자 인증과 묶어야 하는가?
-> PIN, 생체 인증, 서버 복구 정책까지 함께 봐야 한다.
```

## 기존 평문 DB에 바로 적용할 수 있을까

새 DB를 처음부터 SQLCipher로 만들면 비교적 단순하다.

하지만 이미 배포된 앱에 평문 SQLite DB가 있고, 그 DB를 SQLCipher로 바꾸려면 별도 마이그레이션이 필요하다.

단순히 `openHelperFactory(factory)`만 붙였다고 기존 평문 DB가 자동으로 암호화 DB가 되는 것은 아니다.

마이그레이션은 대체로 이런 순서로 따로 준비한다.

```text
기존 평문 DB 열기
-> 새 SQLCipher DB 만들기
-> 데이터 복사
-> 검증
-> 기존 평문 DB 삭제
-> 이후부터 SQLCipher DB 사용
```

이 과정에서 실패하면 데이터 손실이 생길 수 있으므로, 실제 제품 코드에서는 마이그레이션과 롤백 전략을 함께 준비해야 한다.

이 글의 예제는 새 암호화 DB를 만드는 기본 흐름에 초점을 둔다.

## 한 문장으로 정리하면

SQLCipher 기반 SQLite DB 암호화는 다음처럼 정리할 수 있다.

```text
SQLCipher는 SQLite DB 파일 자체를 암호화하고,
Room은 SupportOpenHelperFactory를 통해 그 암호화 DB를 열며,
DB를 여는 passphrase는 코드에 하드코딩하지 않고
Android Keystore 같은 보안 계층으로 보호해야 한다.
```

역할을 다시 나누면 이렇다.

```text
Room/DAO
= 앱 코드가 DB를 읽고 쓰는 인터페이스

SQLCipher
= SQLite DB 파일 암호화 계층

DB passphrase
= SQLCipher DB 파일을 여는 열쇠

Android Keystore
= passphrase를 보호하는 키 관리 계층
```

SQLCipher의 목적은 Room을 대체하거나 DB 접근 코드를 더 편하게 만드는 것이 아니다. 디스크에 남는 SQLite 파일이 외부로 빠져나갔을 때, 키 없이 내용을 바로 읽기 어렵게 만드는 데 있다.

## 참고하면 좋은 문서

- [SQLCipher for Android](https://github.com/sqlcipher/sqlcipher-android)
- [RoomDatabase.Builder - openHelperFactory](https://developer.android.com/reference/androidx/room/RoomDatabase.Builder)
- [Android Keystore system](https://developer.android.com/privacy-and-security/keystore)
