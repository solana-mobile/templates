/**
 * File system utilities
 *
 * All functions return Results instead of throwing exceptions
 * for predictable error handling.
 */

import { writeFileSync, existsSync, unlinkSync } from 'fs'
import { Result, ok, tryCatch } from './result.js'

/**
 * Write string to file
 */
export const writeFile = (path: string, content: string): Result<void> => {
  return tryCatch(() => {
    writeFileSync(path, content, 'utf-8')
  })
}

/**
 * Check if file exists
 */
export const fileExists = (path: string): boolean => {
  return existsSync(path)
}

/**
 * Delete a file if it exists
 * Returns ok(true) if deleted, ok(false) if didn't exist
 */
export const deleteFile = (path: string): Result<boolean> => {
  if (!fileExists(path)) {
    return ok(false)
  }

  return tryCatch(() => {
    unlinkSync(path)
    return true
  })
}
