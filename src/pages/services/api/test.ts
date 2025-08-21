/**
 * Airtable API Testing Utilities
 * Provides detailed diagnostic information about Airtable configuration
 */

import { ApiError } from './types'
import { airtableService } from './airtable'

export interface DiagnosticResult {
  configured: boolean
  connection: boolean
  programs: boolean
  resources: boolean
  auth: boolean
  error?: string
  details?: {
    baseId: string
    tables: string[]
    programsCount: number
    resourcesCount: number
    membersCount: number
    lastError?: string
  }
}

/**
 * Run comprehensive Airtable diagnostics
 */
export async function runAirtableDiagnostics(): Promise<DiagnosticResult> {
  const result: DiagnosticResult = {
    configured: false,
    connection: false,
    programs: false,
    resources: false,
    auth: false,
    details: {
      baseId: 'appuo6esxsc55yCgI',
      tables: ['tblsxymfQsAnyg5OU', 'tbl5YcwOmdgIoENEJ', 'tblCTUDN0EQWo1jAl'],
      programsCount: 0,
      resourcesCount: 0,
      membersCount: 0
    }
  }

  try {
    // Check if configured
    result.configured = airtableService.isConfigured()

    if (!result.configured) {
      result.error = 'AIRTABLE_API_KEY not found in environment variables'
      return result
    }

    // Test basic connection by trying to get programs
    try {
      const programs = await airtableService.getClinicalPrograms()
      result.connection = true
      result.programs = true
      result.details.programsCount = programs.length
    } catch (error: any) {
      result.connection = false
      result.details.lastError = error.message
      result.error = `Connection test failed: ${error.message}`
      return result
    }

    // Test resources
    try {
      const resources = await airtableService.getResources()
      result.resources = true
      result.details.resourcesCount = resources.length
    } catch (error: any) {
      result.resources = false
      result.error = `Resources test failed: ${error.message}`
    }

    // Test auth (expect failure but not 404)
    try {
      await airtableService.authenticateMember('test@example.com', 'test')
    } catch (error: any) {
      // We expect auth to fail, but it should fail gracefully
      result.auth = !error.message.includes('NOT_FOUND') && !error.message.includes('CONFIG_ERROR')
    }

  } catch (error: any) {
    result.error = `Diagnostic failed: ${error.message}`
  }

  return result
}

/**
 * Test specific table access
 */
export async function testTableAccess(tableId: string): Promise<{ success: boolean; error?: string; recordCount?: number }> {
  try {
    const records = await airtableService['getRecords'](tableId)
    return {
      success: true,
      recordCount: records.length
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Validate Airtable API key format
 */
export function validateApiKeyFormat(apiKey: string): { valid: boolean; error?: string } {
  if (!apiKey) {
    return { valid: false, error: 'API key is empty' }
  }

  if (!apiKey.startsWith('pat')) {
    return { valid: false, error: 'API key should start with "pat"' }
  }

  if (apiKey.length < 20) {
    return { valid: false, error: 'API key appears too short' }
  }

  return { valid: true }
}