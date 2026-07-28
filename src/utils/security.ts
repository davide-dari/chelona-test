import { Module, ModuleType } from '../types';

/**
 * Checks whether a module or category type is sensitive and requires biometric authentication
 */
export function isModuleSensitive(moduleOrType: Module | ModuleType | string | null | undefined): boolean {
  if (!moduleOrType) return false;

  if (typeof moduleOrType === 'object') {
    // Explicit user override on the module instance
    if (moduleOrType.isSensitive !== undefined) {
      return moduleOrType.isSensitive;
    }
    
    // Default sensitive module types
    const type = moduleOrType.type;
    if (type === 'generic') {
      const template = (moduleOrType as any).template;
      return template === 'identity' || template === 'tax-code';
    }

    return ['auto', 'document', 'single-expense', 'installments', 'split'].includes(type);
  }

  // Called with category string
  const typeStr = String(moduleOrType);
  return ['auto', 'document', 'single-expense', 'installments', 'split'].includes(typeStr);
}
