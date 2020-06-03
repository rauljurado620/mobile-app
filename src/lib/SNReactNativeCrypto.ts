import { SNPureCrypto } from 'snjs';
import { Base64 } from 'js-base64';
import { decode as decodeBase64toArrayBuffer } from 'base64-arraybuffer';
import Sodium from 'react-native-sodium';
import Aes from 'react-native-aes-crypto';

export class SNReactNativeCrypto extends SNPureCrypto {
  public async pbkdf2(
    password: string,
    salt: string,
    iterations: number,
    length: number
  ): Promise<string | null> {
    return Aes.pbkdf2(password, salt, iterations, length);
  }

  public async generateRandomKey(bits: number): Promise<string> {
    const bytes = bits / 8;
    return Aes.randomKey(bytes);
  }

  public async aes256CbcEncrypt(
    plaintext: string,
    iv: string,
    key: string
  ): Promise<string | null> {
    try {
      return Aes.encrypt(plaintext, key, iv);
    } catch (e) {
      return null;
    }
  }

  public async aes256CbcDecrypt(
    ciphertext: string,
    iv: string,
    key: string
  ): Promise<string | null> {
    try {
      return Aes.decrypt(ciphertext, key, iv);
    } catch (e) {
      return null;
    }
  }

  public async hmac256(message: string, key: string): Promise<string | null> {
    try {
      return Aes.hmac256(message, key);
    } catch (e) {
      return null;
    }
  }

  public async sha256(text: string): Promise<string> {
    return Aes.sha256(text);
  }

  public unsafeSha1(text: string): Promise<string> {
    return Aes.sha1(text);
  }

  public async argon2(
    password: string,
    salt: string,
    iterations: number,
    bytes: number,
    length: number
  ): Promise<string> {
    const result = await Sodium.crypto_pwhash(
      length,
      Base64.encode(password),
      Base64.encode(salt),
      iterations,
      bytes,
      Sodium.crypto_pwhash_ALG_DEFAULT
    );
    return Base64.decode(result);
  }

  public async xchacha20Encrypt(
    plaintext: string,
    nonce: string,
    key: string,
    assocData: string
  ): Promise<string> {
    return Sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
      Base64.encode(plaintext),
      Base64.encode(nonce),
      Base64.encode(key),
      Base64.encode(assocData)
    );
  }

  public async xchacha20Decrypt(
    ciphertext: string,
    nonce: string,
    key: string,
    assocData: string
  ): Promise<string | null> {
    try {
      const result = await Sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
        Base64.encode(ciphertext),
        Base64.encode(nonce),
        Base64.encode(key),
        Base64.encode(assocData)
      );
      return Base64.decode(result);
    } catch (e) {
      return null;
    }
  }

  /**
   * Not implemented in SNReactNativeCrypto
   */
  public generateUUIDSync() {
    return '';
  }

  public async generateUUID() {
    const randomBuf = await Sodium.randombytes_buf(16);
    const buf = new Uint32Array(decodeBase64toArrayBuffer(randomBuf));
    let idx = -1;
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (
      c
    ) {
      idx++;
      const r = (buf[idx >> 3] >> ((idx % 8) * 4)) & 15;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  public async base64Encode(text: string) {
    return new Promise<string>(resolve => {
      resolve(Base64.encode(text));
    });
  }

  public async base64Decode(base64String: string) {
    return new Promise<string>(resolve => {
      resolve(Base64.decode(base64String));
    });
  }
}
