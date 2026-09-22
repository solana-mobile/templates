/** Shortens a long identifier — an address or a signature — to its first and last few characters. */
export function ellipsify(str = '', len = 4, delimiter = '…') {
  const strLen = str.length
  const limit = len * 2 + delimiter.length

  return strLen >= limit
    ? str.substring(0, len) + delimiter + str.substring(strLen - len, strLen)
    : str
}
