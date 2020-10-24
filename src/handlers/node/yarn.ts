import { registry, CacheHandler } from '../../registry'
import { hashFiles, exec, matches, runner } from '../../expressions'

class Yarn extends CacheHandler {
    async getPaths(): Promise<string[]> {
        return [await exec('yarn', 'cache', 'dir')]
    }

    async getKey(version?: string): Promise<string> {
        return `${runner.os}-${version}-yarn-${await hashFiles('**/yarn.lock')}`
    }

    async getRestoreKeys(version?: string): Promise<string[]> {
        return [`${runner.os}-${version}-yarn-`]
    }

    async shouldCache(): Promise<boolean> {
        return await matches('**/yarn.lock')
    }
}

registry.add("yarn", new Yarn())