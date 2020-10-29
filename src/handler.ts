import * as core from '@actions/core'
import { saveCache, restoreCache, ReserveCacheError } from '@actions/cache'
import * as state from './state'

export interface ICacheOptions {
  version?: string
}

export enum RestoreType {
  Miss,
  Partial,
  Full,
}

export interface IRestoreResult {
  type: RestoreType
  restoredKey: string | undefined
}

export class CacheHandler {
  async getPaths(): Promise<string[]> {
    throw Error('not implemented')
  }

  async getKey(version?: string): Promise<string> {
    throw Error('not implemented')
  }

  async getKeyForRestore(version?: string): Promise<string> {
    return this.getKey(version)
  }

  async getKeyForSave(version?: string): Promise<string> {
    return state.readPrimaryKey(this) ?? this.getKey(version)
  }

  async getRestoreKeys(version?: string): Promise<string[]> {
    return []
  }

  async shouldCache(): Promise<boolean> {
    return false
  }

  async setup(): Promise<void> {}

  async saveCache(options?: ICacheOptions): Promise<void> {
    const paths = await this.getPaths()
    const key = await this.getKeyForSave(options?.version)
    const restoredKey = state.readRestoredKey(this)

    if (key === restoredKey) {
      core.info(`Cache hit on primary key '${key}', skip saving cache`)
    } else {
      core.info(`Calling saveCache('${paths}', '${key}')`)

      try {
        await saveCache(paths, key)
      } catch (error) {
        if (error instanceof ReserveCacheError) {
          core.info(`Cache already exists, skip saving cache`)
        } else {
          throw error
        }
      }
    }
  }

  async restoreCache(options?: ICacheOptions): Promise<IRestoreResult> {
    const paths = await this.getPaths()
    const key = await this.getKeyForRestore(options?.version)
    const restoreKeys = await this.getRestoreKeys(options?.version)

    core.info(`Calling restoreCache('${paths}', '${key}', ${restoreKeys})`)
    const restoredKey = await restoreCache(paths, key, restoreKeys)

    state.savePrimaryKey(this, key)
    state.addHandler(this)

    if (restoredKey) {
      core.info(`Restored cache with key '${restoredKey}'`)
      state.saveRestoredKey(this, restoredKey)
    }

    return {
      type: restoredKey ? (key === restoredKey ? RestoreType.Full : RestoreType.Partial) : RestoreType.Miss,
      restoredKey: restoredKey,
    }
  }
}
