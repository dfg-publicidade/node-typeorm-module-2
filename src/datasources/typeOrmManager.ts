import Util from '@dfgpublicidade/node-util-module';
import appDebugger from 'debug';
import { Connection, ConnectionManager, getConnectionManager } from 'typeorm';

/* Module */
const debug: appDebugger.IDebugger = appDebugger('module:typeorm-manager');

const connectionManager: ConnectionManager = getConnectionManager();

class TypeOrmManager {
    protected static entities: any[] = [];

    public static async connect(config: any): Promise<Connection> {
        debug('Connection request received');
        
        if (!config) {
            throw new Error('Connection config. was not provided.');
        }
        if (!config.name) {
            throw new Error('Connection name was not provided.');
        }

        let conn: Connection;
        if (connectionManager.has(config.name) && (conn = connectionManager.get(config.name)).isConnected) {
            debug('Delivering previously made connection');
            return Promise.resolve(conn);
        }
        else {
            debug('Making a new connection');

            const ormConfig: any = { ...config };

            for (const entity of this.entities) {
                ormConfig.entities.push(entity);
            }

            conn = connectionManager.create(ormConfig);

            try {
                conn = await conn.connect();

                debug('Connection done');

                return Promise.resolve(conn);
            }
            catch (error: any) {
                debug('Connection attempt error');
                return Promise.reject(error);
            }
        }
    }

    public static async close(name: string): Promise<void> {
        debug('Closing connection');

        if (!name) {
            throw new Error('Connection name was not provided.');
        }

        try {
            if (connectionManager.get(name).isConnected) {
                await connectionManager.get(name).close();
                debug('Connection closed');
            }
        }
        catch (error: any) {
            debug('Connection close attempt error');
            throw error;
        }
    }

    public static getConnection(name: string): Connection {
        if (!name) {
            throw new Error('Connection name was not provided.');
        }
        
        return connectionManager.has(name)
            ? connectionManager.get(name)
            : undefined;
    }

    public static async wait(config: any): Promise<void> {
        if (!config) {
            throw new Error('Config. was not provided.');
        }
        if (!config.name) {
            throw new Error('Connection name was not provided.');
        }
        
        if (TypeOrmManager.getConnection(config.name) && TypeOrmManager.getConnection(config.name).isConnected) {
            await Util.delay100ms();
            debug('Waiting for connection.');
            return this.wait(config);
        }
        else {
            debug('Connection closed. Proceeding...');
            return Promise.resolve();
        }
    }
}

export default TypeOrmManager;
