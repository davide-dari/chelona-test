export const lzw = {
  compress: (str: string): string => {
    if (!str) return '';
    const dictionary: { [key: string]: number } = {};
    for (let i = 0; i < 256; i++) {
      dictionary[String.fromCharCode(i)] = i;
    }
    
    let word = "";
    const result: number[] = [];
    let dictSize = 256;
    
    for (let i = 0; i < str.length; i++) {
      const c = str.charAt(i);
      const wc = word + c;
      if (dictionary.hasOwnProperty(wc)) {
        word = wc;
      } else {
        result.push(dictionary[word]);
        if (dictSize < 4096) {
          dictionary[wc] = dictSize++;
        }
        word = c;
      }
    }
    if (word !== "") {
      result.push(dictionary[word]);
    }
    
    // Convert array of codes (up to 12-bit) to bytes
    const bytes = new Uint8Array(result.length * 2);
    for (let i = 0; i < result.length; i++) {
      bytes[i * 2] = result[i] & 0xff;
      bytes[i * 2 + 1] = (result[i] >> 8) & 0xff;
    }
    
    // Convert bytes to base64
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return 'LZW:' + btoa(binary);
  },
  
  decompress: (base64Str: string): string => {
    if (!base64Str) return '';
    if (!base64Str.startsWith('LZW:')) return base64Str;
    
    const binary = atob(base64Str.substring(4));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    
    const codes: number[] = [];
    for (let i = 0; i < bytes.length; i += 2) {
      codes.push(bytes[i] | (bytes[i + 1] << 8));
    }
    
    if (codes.length === 0) return '';
    
    const dictionary: { [key: number]: string } = {};
    for (let i = 0; i < 256; i++) {
      dictionary[i] = String.fromCharCode(i);
    }
    
    let dictSize = 256;
    let oldWord = String.fromCharCode(codes[0]);
    let result = oldWord;
    
    for (let i = 1; i < codes.length; i++) {
      const code = codes[i];
      let word = "";
      if (dictionary.hasOwnProperty(code)) {
        word = dictionary[code];
      } else if (code === dictSize) {
        word = oldWord + oldWord.charAt(0);
      } else {
        throw new Error("LZW decompression error");
      }
      
      result += word;
      if (dictSize < 4096) {
        dictionary[dictSize++] = oldWord + word.charAt(0);
      }
      oldWord = word;
    }
    return result;
  }
};
