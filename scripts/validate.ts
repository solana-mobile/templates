#!/usr/bin/env tsx
/**
 * Validate generated output matches expected format
 *
 * Structure is checked with the schema create-solana-dapp itself consumes, so
 * this repo cannot drift from the CLI. Everything after that is a repo-specific
 * rule the shared schema does not cover.
 *
 * Usage: tsx scripts/validate.ts
 */

import { parseTemplateJson, type TemplateJsonGroup } from 'create-solana-dapp'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { readFile, fileExists } from './shared/fs-utils.js'
import { type Result, ok, err } from './shared/result.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = join(__dirname, '..')
const TEMPLATES_JSON_PATH = join(ROOT_DIR, 'templates.json')
const TEMPLATES_MD_PATH = join(ROOT_DIR, 'TEMPLATES.md')

// Constants
const GIGET_PREFIX = 'gh:' as const

type ValidationIssue = {
  readonly severity: 'error' | 'warning'
  readonly message: string
}

// Check if required files exist
const checkFilesExist = (): ValidationIssue[] => {
  const issues: ValidationIssue[] = []

  if (!fileExists(TEMPLATES_JSON_PATH)) {
    issues.push({
      severity: 'error',
      message: 'templates.json does not exist',
    })
  }

  if (!fileExists(TEMPLATES_MD_PATH)) {
    issues.push({
      severity: 'error',
      message: 'TEMPLATES.md does not exist',
    })
  }

  return issues
}

// Parse templates.json with the schema create-solana-dapp consumes
const parseTemplatesJson = (): Result<readonly TemplateJsonGroup[]> => {
  const contentResult = readFile(TEMPLATES_JSON_PATH)
  if (!contentResult.ok) {
    return err(`Failed to read templates.json: ${contentResult.error}`)
  }

  const parsed = parseTemplateJson(contentResult.value)
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `\n      - ${issue.path.length > 0 ? `${issue.path.join('.')}: ` : ''}${issue.message}`)
      .join('')
    return err(`templates.json does not match the create-solana-dapp schema:${details}`)
  }

  return ok(parsed.data)
}

// Check template IDs use the giget prefix
const checkTemplateIds = (groups: readonly TemplateJsonGroup[]): ValidationIssue[] => {
  return groups.flatMap((group) =>
    group.templates
      .filter((template) => !template.id.startsWith(GIGET_PREFIX))
      .map((template) => ({
        severity: 'error' as const,
        message: `Template "${template.name}" id must start with "${GIGET_PREFIX}"`,
      })),
  )
}

// Check every template carries keywords
const checkTemplateKeywords = (groups: readonly TemplateJsonGroup[]): ValidationIssue[] => {
  return groups.flatMap((group) =>
    group.templates
      .filter((template) => template.keywords.length === 0)
      .map((template) => ({
        severity: 'warning' as const,
        message: `Template "${template.name}" has no keywords`,
      })),
  )
}

// Check for duplicate template IDs
const checkDuplicateIds = (groups: readonly TemplateJsonGroup[]): ValidationIssue[] => {
  const issues: ValidationIssue[] = []
  const idMap = new Map<string, string[]>()

  groups.forEach((group) => {
    group.templates.forEach((template) => {
      const existing = idMap.get(template.id) || []
      idMap.set(template.id, [...existing, template.name])
    })
  })

  Array.from(idMap.entries())
    .filter(([, names]) => names.length > 1)
    .forEach(([id, names]) => {
      issues.push({
        severity: 'error',
        message: `Duplicate template ID "${id}" found in: ${names.join(', ')}`,
      })
    })

  return issues
}

// Check the catalog is not empty
const checkGroupsPresent = (groups: readonly TemplateJsonGroup[]): ValidationIssue[] => {
  if (groups.length > 0) return []

  return [{ severity: 'warning', message: 'templates.json contains no groups' }]
}

// Repo-specific rules on top of the schema
const checkGroups = (groups: readonly TemplateJsonGroup[]): ValidationIssue[] => [
  ...checkGroupsPresent(groups),
  ...checkTemplateIds(groups),
  ...checkTemplateKeywords(groups),
  ...checkDuplicateIds(groups),
]

// Main validation pipeline
const validate = (): Result<void> => {
  const parseResult = parseTemplatesJson()

  const allIssues: ValidationIssue[] = [
    ...checkFilesExist(),
    ...(parseResult.ok ? checkGroups(parseResult.value) : [{ severity: 'error' as const, message: parseResult.error }]),
  ]

  const errors = allIssues.filter((issue) => issue.severity === 'error')
  const warnings = allIssues.filter((issue) => issue.severity === 'warning')

  if (warnings.length > 0) {
    console.log('\nWarnings:')
    warnings.forEach((warning) => {
      console.log(`  - ${warning.message}`)
    })
  }

  if (errors.length > 0) {
    console.log('\nErrors:')
    errors.forEach((error) => {
      console.log(`  - ${error.message}`)
    })
    return err(`Found ${errors.length} error(s)`)
  }

  return ok(undefined)
}

const main = () => {
  console.log('Validating generated files...')

  const result = validate()

  if (!result.ok) {
    console.error(`\nValidation failed: ${result.error}`)
    process.exit(1)
  }

  console.log('\nValidation passed')
}

main()
