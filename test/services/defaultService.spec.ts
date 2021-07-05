import App, { AppInfo } from '@dfgpublicidade/node-app-module';
import Paginate from '@dfgpublicidade/node-pagination-module';
import { expect } from 'chai';
import { after, before, describe, it } from 'mocha';
import { Column, Connection, Entity, EntityManager, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, SelectQueryBuilder } from 'typeorm';
import { DefaultService, JoinType, ServiceOptions, TypeOrmManager } from '../../src';

/* Tests */
@Entity({
    name: 'Test'
})
class Test {
    @PrimaryGeneratedColumn()
    public id: number;

    @Column({
        type: 'varchar'
    })
    public name: string;

    @Column({
        name: 'created_at',
        type: 'datetime'
    })
    public createdAt: Date;

    @Column({
        name: 'updated_at',
        type: 'datetime'
    })
    public updatedAt: Date;

    @Column({
        name: 'deleted_at',
        type: 'datetime'
    })
    public deletedAt: Date;

    @OneToMany((type: Test2): any => Test2, (test2: Test2): Test => test2.test)
    public tests: Test2[];

    @OneToMany((type: Test2): any => Test2, (test2: Test2): Test => test2.testB)
    public testsB: Test2[];
}

@Entity({
    name: 'Test2'
})
class Test2 {
    @PrimaryGeneratedColumn()
    public id: number;

    @ManyToOne((type: Test): any => Test, (test: Test): Test2[] => test.tests)
    @JoinColumn({ name: 'test', referencedColumnName: 'id' })
    public test: Test;

    @ManyToOne((type: Test): any => Test, (test: Test): Test2[] => test.testsB)
    @JoinColumn({ name: 'testB', referencedColumnName: 'id' })
    public testB: Test;

    @Column({
        name: 'deleted_at',
        type: 'datetime'
    })
    public deletedAt: Date;

    @OneToMany((type: Test3): any => Test3, (test3: Test3): Test2 => test3.test)
    public tests: Test3[];
}

@Entity({
    name: 'Test3'
})
class Test3 {
    @PrimaryGeneratedColumn()
    public id: number;

    @ManyToOne((type: Test2): any => Test2, (test: Test2): Test3[] => test.tests)
    @JoinColumn({ name: 'test', referencedColumnName: 'id' })
    public test: Test2;
}

class TypeOrmManagerTest extends TypeOrmManager {
    protected static entities: any[] = [
        Test,
        Test2,
        Test3
    ];
}

class TestService extends DefaultService<Test> {
    private static instances: TestService[] = [];

    protected defaultSorting: any = {
        '$alias.name': 'ASC'
    };

    private constructor(connectionName: string) {
        super(Test, connectionName);

        this.parentEntities = [];

        this.childEntities = [{
            name: 'tests',
            alias: 'Test2',
            service: TestService2
        }, {
            name: 'testsB',
            alias: 'Test2',
            service: TestService2
        }];
    }

    public static getInstance(connectionName: string): TestService {
        let instance: TestService = this.instances.find((instance: TestService): boolean => instance.connectionName === connectionName);

        if (!instance) {
            instance = new TestService(connectionName);
            this.instances.push(instance);
        }

        return instance;
    }

    public setChildJoinType(joinType: JoinType): void {
        this.childEntities[0].joinType = joinType;
    }

    public deleteChildJoinType(): void {
        delete this.childEntities[0].joinType;
    }

    public setAndWhere(andWhere: string): void {
        this.childEntities[0].andWhere = andWhere;
    }

    public deleteAndWhere(): void {
        delete this.childEntities[0].andWhere;
    }

    public setDeletedField(deletedAtField: string): void {
        this.deletedAtField = deletedAtField;
    }

    public setDependent(dependent: boolean): void {
        this.childEntities[0].dependent = dependent;
    }

    public setDefaultQuery(alias: string, qb: SelectQueryBuilder<any>, serviceOptions: ServiceOptions<any>, options?: any): void {
        super.setDefaultQuery(alias, qb, serviceOptions, options);

        if (serviceOptions?.sort) {
            qb.addOrderBy('test.id', 'ASC');
        }
    }
}

class TestService2 extends DefaultService<Test2> {
    private static instances: TestService2[] = [];

    public deletedAtField: string = undefined;

    private constructor(connectionName: string) {
        super(Test2, connectionName);

        this.parentEntities = [{
            name: 'test',
            alias: 'Test',
            service: TestService
        }, {
            name: 'testB',
            alias: 'TestB',
            service: TestService
        }];

        this.childEntities = [];
    }

    public static getInstance(connectionName: string): TestService2 {
        let instance: TestService2 = this.instances.find((instance: TestService2): boolean => instance.connectionName === connectionName);

        if (!instance) {
            instance = new TestService2(connectionName);
            this.instances.push(instance);
        }

        return instance;
    }

    public setDefaultQuery(alias: string, qb: SelectQueryBuilder<any>): void {
        super.setDefaultQuery(alias, qb, {});

        qb.andWhere(`${alias}.id > 0`);
    }

    public setDefaultSorting(sort: any): void {
        this.defaultSorting = sort;
    }

    public setDeletedAtField(deletedAtField: string): void {
        this.deletedAtField = deletedAtField;
    }

    public setParentJoinType(joinType: JoinType): void {
        this.parentEntities[0].joinType = joinType;
        this.parentEntities[1].joinType = joinType;
    }

    public deleteParentJoinType(): void {
        delete this.parentEntities[0].joinType;
        delete this.parentEntities[1].joinType;
    }

    public addParent(item: any): void {
        this.parentEntities.push(item);
    }

    public removeParent(): void {
        this.parentEntities.pop();
    }

    public setDependent(dependent: boolean): void {
        this.parentEntities[0].dependent = dependent;
    }
}

class TestService3 extends DefaultService<Test3> {
    private constructor(connectionName: string) {
        super(Test3, connectionName);

        this.parentEntities = [{
            name: 'test',
            alias: 'Test2',
            service: TestService2
        }];

        this.childEntities = [];
    }

    public static getInstance(connectionName: string): TestService3 {
        return new TestService3(connectionName);
    }
}

class TestServiceB extends DefaultService<Test> {
    private constructor(connectionName: string) {
        super(Test, connectionName);
    }

    public static getInstance(connectionName: string): TestServiceB {
        return new TestServiceB(connectionName);
    }
}

class TestServiceFail extends DefaultService<Test> {
    private constructor(connectionName: string) {
        super(undefined, connectionName);
    }

    public static getInstance(connectionName: string): TestServiceFail {
        return new TestServiceFail(connectionName);
    }
}

describe('DefaultService', (): void => {
    const connectionName: string = 'mysql';
    let connection: Connection;

    let testService: TestService;
    let testService2: TestService2;
    let testService3: TestService3;
    let app: App;

    const options: any = {
        disabled: false,
        type: 'mysql',
        name: connectionName,
        host: process.env.MYSQL_TEST_HOST,
        port: 3306,
        username: process.env.MYSQL_TEST_USER,
        password: process.env.MYSQL_TEST_PASSWORD,
        database: process.env.MYSQL_TEST_DB,
        timezone: 'local',
        pool: {
            min: 0,
            max: 1
        },
        entities: [],
        synchronize: false
    };

    before(async (): Promise<void> => {
        if (!process.env.MYSQL_TEST_HOST) {
            throw new Error('MYSQL_TEST_HOST must be set');
        }
        if (!process.env.MYSQL_TEST_USER) {
            throw new Error('MYSQL_TEST_USER must be set');
        }
        if (!process.env.MYSQL_TEST_PASSWORD) {
            throw new Error('MYSQL_TEST_PASSWORD must be set');
        }
        if (!process.env.MYSQL_TEST_DB) {
            throw new Error('MYSQL_TEST_DB must be set');
        }

        connection = await TypeOrmManagerTest.connect(options);

        await connection.manager.query(`
            CREATE TABLE IF NOT EXISTS Test (
                id INT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(10),
                created_at DATE,
                updated_at DATE,
                deleted_at DATE
            )
        `);
        // eslint-disable-next-line max-len
        await connection.manager.query(`
            CREATE TABLE IF NOT EXISTS Test2 (
                id INT PRIMARY KEY AUTO_INCREMENT,
                test INT,
                testB INT,
                deleted_at DATE,
                CONSTRAINT FOREIGN KEY (test) REFERENCES Test(id),
                CONSTRAINT FOREIGN KEY (testB) REFERENCES Test(id)
            )
        `);
        await connection.manager.query(`
            CREATE TABLE IF NOT EXISTS Test3 (
                id INT PRIMARY KEY AUTO_INCREMENT,
                test INT,
                CONSTRAINT FOREIGN KEY (test) REFERENCES Test2(id)
            )
        `);

        await connection.manager.query(`
            INSERT INTO Test(name) VALUES ('test')
        `);
        await connection.manager.query(`
            INSERT INTO Test2(test, testB) VALUES (1, 1)
        `);
        await connection.manager.query(`
            INSERT INTO Test3(test) VALUES (1)
        `);

        const appInfo: AppInfo = {
            name: 'test',
            version: 'v1'
        };

        app = new App({
            appInfo,
            config: {
                pagination: {
                    limit: 20
                }
            }
        });
    });

    after(async (): Promise<void> => {
        await connection.manager.query('DROP TABLE Test3');
        await connection.manager.query('DROP TABLE Test2');
        await connection.manager.query('DROP TABLE Test');

        await TypeOrmManagerTest.close(options.name);
    });

    it('1. constructor', async (): Promise<void> => {
        expect((): void => {
            TestServiceFail.getInstance(undefined);
        }).to.throw('Repository type was not provided.');
    });

    it('2. constructor', async (): Promise<void> => {
        expect((): void => {
            TestService.getInstance(undefined);
        }).to.throw('Connection name was not provided');
    });

    it('3. constructor', async (): Promise<void> => {
        testService = TestService.getInstance(connectionName);
        testService2 = TestService2.getInstance(connectionName);
        testService3 = TestService3.getInstance(connectionName);

        expect(testService).to.exist;
        expect(testService2).to.exist;
        expect(testService3).to.exist;
    });

    it('4. getRepository', async (): Promise<void> => {
        let connectionError: any;
        try {
            await TestServiceB.getInstance('invalid').getRepository().query('SELECT 1');
        }
        catch (error: any) {
            connectionError = error;
        }

        expect(connectionError).to.exist;
        expect(connectionError.message).to.contain('Connection or repository not found');
    });

    it('5. getRepository', async (): Promise<void> => {
        expect((await testService.getRepository().query('SELECT 1 AS result'))[0].result).to.be.eq('1');
    });

    it('6. translateParams', async (): Promise<void> => {
        expect(testService.translateParams(undefined)).to.be.eq('');
    });

    it('7. translateParams', async (): Promise<void> => {
        expect(testService2.translateParams('test2')).to.be.eq('test2');
    });

    it('8. translateParams', async (): Promise<void> => {
        expect(testService2.translateParams('test2.id')).to.be.eq('test2._id');
    });

    it('9. translateParams', async (): Promise<void> => {
        expect(testService2.translateParams('test2.test.id')).to.be.eq('test2Test._id');
    });

    it('10. translateParams', async (): Promise<void> => {
        expect(testService2.translateParams('test2.invalid.id')).to.be.undefined;
    });

    it('11. translateParams', async (): Promise<void> => {
        expect(testService2.translateParams('test2.test.invalid.id')).to.be.undefined;
    });

    it('12. translateParams', async (): Promise<void> => {
        expect(testService.translateParams('test.tests.id')).to.be.eq('testTest2._id');
    });

    it('13. translateParams', async (): Promise<void> => {
        expect(testService.translateParams('test.tests.invalid.id')).to.be.undefined;
    });

    it('14. setDefaultQuery', async (): Promise<void> => {
        const test: string = 'test';

        const qb: SelectQueryBuilder<Test> = testService.getRepository().createQueryBuilder(test);

        expect((): void => {
            testService.setDefaultQuery(undefined, qb, {});
        }).to.throw('Alias was not provided.');
    });

    it('15. setDefaultQuery', async (): Promise<void> => {
        const test: string = 'test';

        expect((): void => {
            testService.setDefaultQuery(test, undefined, {});
        }).to.throw('Query builder was not provided.');
    });

    it('16. setDefaultQuery', async (): Promise<void> => {
        const test: string = 'test';

        const qb: SelectQueryBuilder<Test> = testService.getRepository().createQueryBuilder(test);

        expect((): void => {
            testService.setDefaultQuery(test, qb, undefined);
        }).to.throw('Service options was not provided.');
    });

    it('17. setDefaultQuery', async (): Promise<void> => {
        const test: string = 'test';

        const qb: SelectQueryBuilder<Test> = testService.getRepository().createQueryBuilder(test);

        testService.setDefaultQuery(test, qb, {});

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
            SELECT
            '${test}'.'id'         AS '${test}_id', 
            '${test}'.'name'       AS '${test}_name',
            '${test}'.'created_at' AS '${test}_created_at',
            '${test}'.'updated_at' AS '${test}_updated_at',
            '${test}'.'deleted_at' AS '${test}_deleted_at' 
            FROM 'Test' '${test}' 
            WHERE '${test}'.'deleted_at' IS NULL
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(await qb.getCount()).to.be.eq(1);
    });

    it('18. setDefaultQuery', async (): Promise<void> => {
        const test2: string = 'test2';

        const qb: SelectQueryBuilder<Test2> = testService2.getRepository().createQueryBuilder(test2);

        testService2.setDefaultQuery(test2, qb);

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
            SELECT
            '${test2}'.'id'         AS '${test2}_id',
            '${test2}'.'deleted_at' AS '${test2}_deleted_at',
            '${test2}'.'test'       AS '${test2}_test',
            '${test2}'.'testB'      AS '${test2}_testB' 
            FROM 'Test2' '${test2}' 
            WHERE '${test2}'.'id' > 0
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(await qb.getCount()).to.be.eq(1);
    });

    it('19. getSorting', async (): Promise<void> => {
        expect((): void => {
            testService.getSorting(undefined, {});
        }).to.throw('Alias was not provided.');
    });

    it('20. getSorting', async (): Promise<void> => {
        expect((): void => {
            testService.getSorting('test', undefined);
        }).to.throw('Service options was not provided.');
    });

    it('21. getSorting', async (): Promise<void> => {
        expect(testService.getSorting('test', {
            sort: {
                'test.name': 'ASC'
            }
        })).to.be.deep.eq({
            'test.name': 'ASC'
        });
    });

    it('22. getSorting', async (): Promise<void> => {
        expect(testService.getSorting('test', {})).to.be.deep.eq({
            'test.name': 'ASC'
        });
    });

    it('23. getSorting', async (): Promise<void> => {
        testService2.setDefaultSorting({
            name: 'ASC'
        });

        let sortingError: any;
        try {
            testService2.getSorting('test2', {});
        }
        catch (error: any) {
            sortingError = error;
        }

        expect(sortingError).to.exist;
        expect(sortingError.message).to.contain('Sort keys must start with \'$alias.\'');

        testService2.setDefaultSorting({});
    });

    it('24. getSorting', async (): Promise<void> => {
        expect(testService2.getSorting('test2', {})).to.be.deep.eq({});
    });

    it('25. getSorting', async (): Promise<void> => {
        testService2.setDefaultSorting({
            '$alias.title': 'ASC'
        });

        expect(testService2.getSorting('test2', {})).to.be.deep.eq({
            'test2.title': 'ASC'
        });

        testService2.setDefaultSorting({});
    });

    it('26. getSorting', async (): Promise<void> => {
        expect(testService2.getSorting('test2', {
            ignore: ['test2Test']
        })).to.be.deep.eq({});
    });

    it('27. getSorting', async (): Promise<void> => {
        testService2.setDefaultSorting({
            '$alias.title': 'ASC'
        });

        expect(testService.getSorting('test', {
            subitems: ['tests', 'others']
        })).to.be.deep.eq({
            'test.name': 'ASC',
            'testTest2.title': 'ASC'
        });

        testService2.setDefaultSorting({});
    });

    it('28. getSorting', async (): Promise<void> => {
        testService2.setDefaultSorting({
            '$alias.title': 'ASC'
        });

        expect(testService.getSorting('test', {
            subitems: ['tests', 'others'],
            ignore: ['others']
        })).to.be.deep.eq({
            'testTest2.title': 'ASC',
            'test.name': 'ASC'
        });

        testService2.setDefaultSorting({});
    });

    it('29. setJoins', async (): Promise<void> => {
        const test: string = 'test';

        const qb: SelectQueryBuilder<Test> = testService.getRepository().createQueryBuilder(test);

        expect((): void => {
            testService.setJoins(undefined, qb, {});
        }).to.throw('Alias was not provided.');
    });

    it('30. setJoins', async (): Promise<void> => {
        const test: string = 'test';

        expect((): void => {
            testService.setJoins(test, undefined, {});
        }).to.throw('Query builder was not provided.');
    });

    it('31. setJoins', async (): Promise<void> => {
        const test: string = 'test';

        const qb: SelectQueryBuilder<Test> = testService.getRepository().createQueryBuilder(test);

        expect((): void => {
            testService.setJoins(test, qb, undefined);
        }).to.throw('Service options was not provided.');
    });

    it('32. setJoins', async (): Promise<void> => {
        const test: string = 'test';
        const test2: string = `${test}Test2`;
        const testB: string = `${test2}TestB`;

        const qb: SelectQueryBuilder<Test> = testService.getRepository().createQueryBuilder(test);

        testService.setJoins(test, qb, {
            subitems: ['tests']
        });

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
            SELECT 
            '${test}'.'id'         AS '${test}_id', 
            '${test}'.'name'       AS '${test}_name', 
            '${test}'.'created_at' AS '${test}_created_at', 
            '${test}'.'updated_at' AS '${test}_updated_at', 
            '${test}'.'deleted_at' AS '${test}_deleted_at', 

            '${test2}'.'id'         AS '${test2}_id', 
            '${test2}'.'deleted_at' AS '${test2}_deleted_at', 
            '${test2}'.'test'       AS '${test2}_test', 
            '${test2}'.'testB'      AS '${test2}_testB', 

            '${testB}'.'id'         AS '${testB}_id', 
            '${testB}'.'name'       AS '${testB}_name', 
            '${testB}'.'created_at' AS '${testB}_created_at', 
            '${testB}'.'updated_at' AS '${testB}_updated_at', 
            '${testB}'.'deleted_at' AS '${testB}_deleted_at' 
            
            FROM 'Test' '${test}'
            LEFT JOIN 'Test2' '${test2}' ON '${test2}'.'test'='${test}'.'id'
                AND ('${test2}'.'id' > 0)
            LEFT JOIN 'Test'  '${testB}' ON '${testB}'.'id'='${test2}'.'testB'
                AND ('${testB}'.'deleted_at' IS NULL)
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(await qb.getCount()).to.be.eq(1);

    });

    it('33. setJoins', async (): Promise<void> => {
        const test: string = 'test';
        const test2: string = `${test}Test2`;
        const testB: string = `${test2}TestB`;

        const qb: SelectQueryBuilder<Test> = testService.getRepository().createQueryBuilder(test);

        testService.setJoins(test, qb, {
            subitems: ['tests'],
            joinType: 'innerJoinAndSelect'
        });

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
            SELECT 
            '${test}'.'id'         AS '${test}_id', 
            '${test}'.'name'       AS '${test}_name', 
            '${test}'.'created_at' AS '${test}_created_at', 
            '${test}'.'updated_at' AS '${test}_updated_at', 
            '${test}'.'deleted_at' AS '${test}_deleted_at', 

            '${test2}'.'id'         AS '${test2}_id', 
            '${test2}'.'deleted_at' AS '${test2}_deleted_at', 
            '${test2}'.'test'       AS '${test2}_test', 
            '${test2}'.'testB'      AS '${test2}_testB', 

            '${testB}'.'id'         AS '${testB}_id', 
            '${testB}'.'name'       AS '${testB}_name', 
            '${testB}'.'created_at' AS '${testB}_created_at', 
            '${testB}'.'updated_at' AS '${testB}_updated_at', 
            '${testB}'.'deleted_at' AS '${testB}_deleted_at' 

            FROM 'Test' '${test}'
            INNER JOIN 'Test2' '${test2}' ON '${test2}'.'test'='${test}'.'id'
            LEFT JOIN 'Test'  '${testB}' ON '${testB}'.'id'='${test2}'.'testB'
            AND ('${testB}'.'deleted_at' IS NULL)
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(await qb.getCount()).to.be.eq(1);
    });

    it('34. setJoins', async (): Promise<void> => {
        const test: string = 'test';
        const test2: string = `${test}Test2`;
        const testB: string = `${test2}TestB`;

        const qb: SelectQueryBuilder<Test> = testService.getRepository().createQueryBuilder(test);

        testService.setChildJoinType('innerJoinAndSelect');

        testService.setJoins(test, qb, {
            subitems: ['tests']
        });

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
            SELECT 
            '${test}'.'id'         AS '${test}_id', 
            '${test}'.'name'       AS '${test}_name', 
            '${test}'.'created_at' AS '${test}_created_at', 
            '${test}'.'updated_at' AS '${test}_updated_at', 
            '${test}'.'deleted_at' AS '${test}_deleted_at', 

            '${test2}'.'id'         AS '${test2}_id', 
            '${test2}'.'deleted_at' AS '${test2}_deleted_at', 
            '${test2}'.'test'       AS '${test2}_test', 
            '${test2}'.'testB'      AS '${test2}_testB', 

            '${testB}'.'id'         AS '${testB}_id', 
            '${testB}'.'name'       AS '${testB}_name', 
            '${testB}'.'created_at' AS '${testB}_created_at', 
            '${testB}'.'updated_at' AS '${testB}_updated_at', 
            '${testB}'.'deleted_at' AS '${testB}_deleted_at' 

            FROM 'Test' '${test}'
            INNER JOIN 'Test2' '${test2}' ON '${test2}'.'test'='${test}'.'id'
            LEFT JOIN 'Test'  '${testB}' ON '${testB}'.'id'='${test2}'.'testB'
            AND ('${testB}'.'deleted_at' IS NULL)
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(await qb.getCount()).to.be.eq(1);

        testService.deleteChildJoinType();
    });

    it('35. setJoins', async (): Promise<void> => {
        const test: string = 'test';
        const test2: string = `${test}Test2`;
        const testB: string = `${test2}TestB`;

        const qb: SelectQueryBuilder<Test> = testService.getRepository().createQueryBuilder(test);

        testService2.setDeletedAtField('deletedAt');

        testService.setJoins(test, qb, {
            subitems: ['tests']
        });

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
            SELECT 
            '${test}'.'id'         AS '${test}_id', 
            '${test}'.'name'       AS '${test}_name', 
            '${test}'.'created_at' AS '${test}_created_at', 
            '${test}'.'updated_at' AS '${test}_updated_at', 
            '${test}'.'deleted_at' AS '${test}_deleted_at', 

            '${test2}'.'id'         AS '${test2}_id', 
            '${test2}'.'deleted_at' AS '${test2}_deleted_at', 
            '${test2}'.'test'       AS '${test2}_test', 
            '${test2}'.'testB'      AS '${test2}_testB', 

            '${testB}'.'id'         AS '${testB}_id', 
            '${testB}'.'name'       AS '${testB}_name', 
            '${testB}'.'created_at' AS '${testB}_created_at', 
            '${testB}'.'updated_at' AS '${testB}_updated_at', 
            '${testB}'.'deleted_at' AS '${testB}_deleted_at' 

            FROM 'Test' '${test}'
            LEFT JOIN 'Test2' '${test2}' ON '${test2}'.'test'='test'.'id'
                AND ('${test2}'.'deleted_at' IS NULL AND 'testTest2'.'id' > 0)
            LEFT JOIN 'Test'  '${testB}' ON '${testB}'.'id'='${test2}'.'testB'
                AND ('${testB}'.'deleted_at' IS NULL)
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(await qb.getCount()).to.be.eq(1);

        testService2.setDeletedAtField(undefined);
    });

    it('36. setJoins', async (): Promise<void> => {
        const test: string = 'test';
        const test2: string = `${test}Test2`;
        const testB: string = `${test2}TestB`;

        const qb: SelectQueryBuilder<Test> = testService.getRepository().createQueryBuilder(test);

        testService.setAndWhere('`testTest2`.`deleted_at` IS NULL');

        testService.setJoins(test, qb, {
            subitems: ['tests']
        });

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
            SELECT
            '${test}'.'id'         AS '${test}_id', 
            '${test}'.'name'       AS '${test}_name', 
            '${test}'.'created_at' AS '${test}_created_at', 
            '${test}'.'updated_at' AS '${test}_updated_at', 
            '${test}'.'deleted_at' AS '${test}_deleted_at', 

            '${test2}'.'id'         AS '${test2}_id', 
            '${test2}'.'deleted_at' AS '${test2}_deleted_at', 
            '${test2}'.'test'       AS '${test2}_test', 
            '${test2}'.'testB'      AS '${test2}_testB', 

            '${testB}'.'id'         AS '${testB}_id', 
            '${testB}'.'name'       AS '${testB}_name', 
            '${testB}'.'created_at' AS '${testB}_created_at', 
            '${testB}'.'updated_at' AS '${testB}_updated_at', 
            '${testB}'.'deleted_at' AS '${testB}_deleted_at' 

            FROM 'Test' '${test}'
            LEFT JOIN 'Test2' '${test2}' ON '${test2}'.'test'='${test}'.'id'
                AND ('${test2}'.'id' > 0 AND '${test2}'.'deleted_at' IS NULL)
            LEFT JOIN 'Test'  '${testB}' ON '${testB}'.'id'='${test2}'.'testB'
                AND ('${testB}'.'deleted_at' IS NULL)
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(await qb.getCount()).to.be.eq(1);

        testService.deleteAndWhere();
    });

    it('37. setJoins', async (): Promise<void> => {
        const test: string = 'test';
        const test2: string = `${test}Test2`;
        const testB: string = `${test2}TestB`;

        const qb: SelectQueryBuilder<Test> = testService.getRepository().createQueryBuilder(test);

        testService2.setDeletedAtField('deletedAt');
        testService.setAndWhere('`testTest2`.`deleted_at` IS NULL');

        testService.setJoins(test, qb, {
            subitems: ['tests']
        });

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
            SELECT
            '${test}'.'id'         AS '${test}_id', 
            '${test}'.'name'       AS '${test}_name', 
            '${test}'.'created_at' AS '${test}_created_at', 
            '${test}'.'updated_at' AS '${test}_updated_at', 
            '${test}'.'deleted_at' AS '${test}_deleted_at', 

            '${test2}'.'id'         AS '${test2}_id', 
            '${test2}'.'deleted_at' AS '${test2}_deleted_at', 
            '${test2}'.'test'       AS '${test2}_test', 
            '${test2}'.'testB'      AS '${test2}_testB', 

            '${testB}'.'id'         AS '${testB}_id', 
            '${testB}'.'name'       AS '${testB}_name', 
            '${testB}'.'created_at' AS '${testB}_created_at', 
            '${testB}'.'updated_at' AS '${testB}_updated_at', 
            '${testB}'.'deleted_at' AS '${testB}_deleted_at' 

            FROM 'Test' '${test}'
            LEFT JOIN 'Test2' '${test2}' ON '${test2}'.'test'='test'.'id'
                AND ('${test2}'.'deleted_at' IS NULL AND '${test2}'.'id' > 0
                AND '${test2}'.'deleted_at' IS NULL)
            LEFT JOIN 'Test'  '${testB}' ON '${testB}'.'id'='${test2}'.'testB'
                AND ('${testB}'.'deleted_at' IS NULL)
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(await qb.getCount()).to.be.eq(1);

        testService.deleteAndWhere();
        testService2.setDeletedAtField(undefined);
    });

    it('38. setJoins', async (): Promise<void> => {
        const test: string = 'test';
        const test2: string = `${test}Test2`;
        const testB: string = `${test2}TestB`;

        const qb: SelectQueryBuilder<Test> = testService.getRepository().createQueryBuilder(test);

        testService.setJoins(test, qb, {
            subitems: ['tests'],
            andWhere: {
                'test.tests': [
                    'testTest2.id = :id', {
                        id: 1
                    }
                ]
            }
        });

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
            SELECT
            '${test}'.'id'         AS '${test}_id', 
            '${test}'.'name'       AS '${test}_name', 
            '${test}'.'created_at' AS '${test}_created_at', 
            '${test}'.'updated_at' AS '${test}_updated_at', 
            '${test}'.'deleted_at' AS '${test}_deleted_at', 

            '${test2}'.'id'         AS '${test2}_id', 
            '${test2}'.'deleted_at' AS '${test2}_deleted_at', 
            '${test2}'.'test'       AS '${test2}_test', 
            '${test2}'.'testB'      AS '${test2}_testB', 

            '${testB}'.'id'         AS '${testB}_id', 
            '${testB}'.'name'       AS '${testB}_name', 
            '${testB}'.'created_at' AS '${testB}_created_at', 
            '${testB}'.'updated_at' AS '${testB}_updated_at', 
            '${testB}'.'deleted_at' AS '${testB}_deleted_at' 
            
            FROM 'Test' '${test}'
            LEFT JOIN 'Test2' '${test2}' ON '${test2}'.'test'='test'.'id'
                AND ('${test2}'.'id' > 0 AND '${test2}'.'id' = ?)
            LEFT JOIN 'Test'  '${testB}' ON '${testB}'.'id'='${test2}'.'testB'
                AND ('${testB}'.'deleted_at' IS NULL)
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(await qb.getCount()).to.be.eq(1);
    });

    it('39. setJoins', async (): Promise<void> => {
        const test: string = 'test';
        const test2: string = `${test}Test2`;
        const testB: string = `${test2}TestB`;

        const qb: SelectQueryBuilder<Test> = testService.getRepository().createQueryBuilder(test);

        testService.setJoins(test, qb, {
            subitems: ['tests'],
            andWhere: {
                'test.id': [
                    'id = :id', {
                        id: 1
                    }
                ]
            }
        });

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
            SELECT
            '${test}'.'id'         AS '${test}_id', 
            '${test}'.'name'       AS '${test}_name', 
            '${test}'.'created_at' AS '${test}_created_at', 
            '${test}'.'updated_at' AS '${test}_updated_at', 
            '${test}'.'deleted_at' AS '${test}_deleted_at', 

            '${test2}'.'id'         AS '${test2}_id', 
            '${test2}'.'deleted_at' AS '${test2}_deleted_at', 
            '${test2}'.'test'       AS '${test2}_test', 
            '${test2}'.'testB'      AS '${test2}_testB', 

            '${testB}'.'id'         AS '${testB}_id', 
            '${testB}'.'name'       AS '${testB}_name', 
            '${testB}'.'created_at' AS '${testB}_created_at', 
            '${testB}'.'updated_at' AS '${testB}_updated_at', 
            '${testB}'.'deleted_at' AS '${testB}_deleted_at' 

            FROM 'Test' '${test}'
            LEFT JOIN 'Test2' '${test2}' ON '${test2}'.'test'='test'.'id'
                AND ('${test2}'.'id' > 0)
            LEFT JOIN 'Test'  '${testB}' ON '${testB}'.'id'='${test2}'.'testB'
                AND ('${testB}'.'deleted_at' IS NULL)
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(await qb.getCount()).to.be.eq(1);
    });

    it('40. setJoins', async (): Promise<void> => {
        const test: string = 'test';
        const test2: string = `${test}Test2`;
        const testB: string = `${test2}TestB`;

        const qb: SelectQueryBuilder<Test> = testService.getRepository().createQueryBuilder(test);

        testService2.setDeletedAtField('deletedAt');

        testService.setJoins(test, qb, {
            subitems: ['tests'],
            andWhere: {
                'test.tests': [
                    'testTest2.id = :id', {
                        id: 1
                    }
                ]
            }
        });

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
            SELECT
            '${test}'.'id'         AS '${test}_id', 
            '${test}'.'name'       AS '${test}_name', 
            '${test}'.'created_at' AS '${test}_created_at', 
            '${test}'.'updated_at' AS '${test}_updated_at', 
            '${test}'.'deleted_at' AS '${test}_deleted_at', 

            '${test2}'.'id'         AS '${test2}_id', 
            '${test2}'.'deleted_at' AS '${test2}_deleted_at', 
            '${test2}'.'test'       AS '${test2}_test', 
            '${test2}'.'testB'      AS '${test2}_testB', 

            '${testB}'.'id'         AS '${testB}_id', 
            '${testB}'.'name'       AS '${testB}_name', 
            '${testB}'.'created_at' AS '${testB}_created_at', 
            '${testB}'.'updated_at' AS '${testB}_updated_at', 
            '${testB}'.'deleted_at' AS '${testB}_deleted_at' 

            FROM 'Test' '${test}'
            LEFT JOIN 'Test2' '${test2}' ON '${test2}'.'test'='test'.'id'
                AND ('${test2}'.'deleted_at' IS NULL AND '${test2}'.'id' > 0 AND '${test2}'.'id' = ?)
            LEFT JOIN 'Test'  '${testB}' ON '${testB}'.'id'='${test2}'.'testB'
                AND ('${testB}'.'deleted_at' IS NULL)
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(await qb.getCount()).to.be.eq(1);

        testService2.setDeletedAtField(undefined);
    });

    it('41. setJoins', async (): Promise<void> => {
        const test: string = 'test';
        const test2: string = `${test}Test2`;
        const testB: string = `${test2}TestB`;

        const qb: SelectQueryBuilder<Test> = testService.getRepository().createQueryBuilder(test);

        testService.setJoins(test, qb, {
            subitems: ['tests'],
            ignore: ['other']
        });

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
            SELECT
            '${test}'.'id'         AS '${test}_id', 
            '${test}'.'name'       AS '${test}_name', 
            '${test}'.'created_at' AS '${test}_created_at', 
            '${test}'.'updated_at' AS '${test}_updated_at', 
            '${test}'.'deleted_at' AS '${test}_deleted_at', 

            '${test2}'.'id'         AS '${test2}_id', 
            '${test2}'.'deleted_at' AS '${test2}_deleted_at', 
            '${test2}'.'test'       AS '${test2}_test', 
            '${test2}'.'testB'      AS '${test2}_testB', 

            '${testB}'.'id'         AS '${testB}_id', 
            '${testB}'.'name'       AS '${testB}_name', 
            '${testB}'.'created_at' AS '${testB}_created_at', 
            '${testB}'.'updated_at' AS '${testB}_updated_at', 
            '${testB}'.'deleted_at' AS '${testB}_deleted_at' 

            FROM 'Test' '${test}'
            LEFT JOIN 'Test2' '${test2}' ON '${test2}'.'test'='test'.'id'
                AND ('${test2}'.'id' > 0)
            LEFT JOIN 'Test'  '${testB}' ON '${testB}'.'id'='${test2}'.'testB'
                AND ('${testB}'.'deleted_at' IS NULL)
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(await qb.getCount()).to.be.eq(1);

        testService2.setDeletedAtField(undefined);
    });

    it('42. setJoins', async (): Promise<void> => {
        const test: string = 'test';

        const qb: SelectQueryBuilder<Test> = testService.getRepository().createQueryBuilder(test);

        testService.setJoins(test, qb, {
            subitems: ['tests'],
            ignore: ['testTest2']
        });

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
            SELECT
            '${test}'.'id'         AS '${test}_id', 
            '${test}'.'name'       AS '${test}_name', 
            '${test}'.'created_at' AS '${test}_created_at', 
            '${test}'.'updated_at' AS '${test}_updated_at', 
            '${test}'.'deleted_at' AS '${test}_deleted_at'
            FROM 'Test' '${test}'
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(await qb.getCount()).to.be.eq(1);
    });

    it('43. setJoins', async (): Promise<void> => {
        const test: string = 'test';

        const qb: SelectQueryBuilder<Test> = testService.getRepository().createQueryBuilder(test);

        testService.setJoins(test, qb, {
            subitems: ['tests'],
            only: 'other'
        });

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
            SELECT
            '${test}'.'id'         AS '${test}_id', 
            '${test}'.'name'       AS '${test}_name', 
            '${test}'.'created_at' AS '${test}_created_at', 
            '${test}'.'updated_at' AS '${test}_updated_at', 
            '${test}'.'deleted_at' AS '${test}_deleted_at'
            FROM 'Test' '${test}'
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(await qb.getCount()).to.be.eq(1);
    });

    it('44. setJoins', async (): Promise<void> => {
        const test2: string = 'test2';
        const test: string = `${test2}Test`;
        const testB: string = `${test2}TestB`;

        const qb: SelectQueryBuilder<Test2> = testService2.getRepository().createQueryBuilder(test2);

        testService2.setJoins(test2, qb, {});

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
            SELECT
            '${test2}'.'id'         AS '${test2}_id', 
            '${test2}'.'deleted_at' AS '${test2}_deleted_at', 
            '${test2}'.'test'       AS '${test2}_test', 
            '${test2}'.'testB'      AS '${test2}_testB', 
            
            '${test}'.'id'         AS '${test}_id', 
            '${test}'.'name'       AS '${test}_name', 
            '${test}'.'created_at' AS '${test}_created_at', 
            '${test}'.'updated_at' AS '${test}_updated_at', 
            '${test}'.'deleted_at' AS '${test}_deleted_at', 

            '${testB}'.'id'         AS '${testB}_id', 
            '${testB}'.'name'       AS '${testB}_name', 
            '${testB}'.'created_at' AS '${testB}_created_at', 
            '${testB}'.'updated_at' AS '${testB}_updated_at', 
            '${testB}'.'deleted_at' AS '${testB}_deleted_at' 
            
            FROM 'Test2' '${test2}'
            INNER JOIN 'Test' '${test}'  ON '${test}'.'id'='${test2}'.'test'
            INNER JOIN 'Test' '${testB}' ON '${testB}'.'id'='${test2}'.'testB'
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(await qb.getCount()).to.be.eq(1);
    });

    it('45. setJoins', async (): Promise<void> => {
        const test2: string = 'test2';
        const test: string = `${test2}Test`;
        const testB: string = `${test2}TestB`;

        const qb: SelectQueryBuilder<Test2> = testService2.getRepository().createQueryBuilder(test2);

        testService2.setParentJoinType('leftJoinAndSelect');

        testService2.setJoins(test2, qb, {});

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
            SELECT
            '${test2}'.'id'         AS '${test2}_id', 
            '${test2}'.'deleted_at' AS '${test2}_deleted_at', 
            '${test2}'.'test'       AS '${test2}_test', 
            '${test2}'.'testB'      AS '${test2}_testB', 
            
            '${test}'.'id'         AS '${test}_id', 
            '${test}'.'name'       AS '${test}_name', 
            '${test}'.'created_at' AS '${test}_created_at', 
            '${test}'.'updated_at' AS '${test}_updated_at', 
            '${test}'.'deleted_at' AS '${test}_deleted_at', 

            '${testB}'.'id'         AS '${testB}_id', 
            '${testB}'.'name'       AS '${testB}_name', 
            '${testB}'.'created_at' AS '${testB}_created_at', 
            '${testB}'.'updated_at' AS '${testB}_updated_at', 
            '${testB}'.'deleted_at' AS '${testB}_deleted_at' 

            FROM 'Test2' '${test2}'
            LEFT JOIN 'Test' '${test}'  ON '${test}'.'id'='${test2}'.'test'
                AND ('${test}'.'deleted_at' IS NULL)
            LEFT JOIN 'Test' '${testB}' ON '${testB}'.'id'='${test2}'.'testB'
                AND ('${testB}'.'deleted_at' IS NULL)
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(await qb.getCount()).to.be.eq(1);

        testService2.deleteParentJoinType();
    });

    it('46. setJoins', async (): Promise<void> => {
        const test2: string = 'test2';
        const test: string = `${test2}Test`;
        const testB: string = `${test2}TestB`;

        const qb: SelectQueryBuilder<Test2> = testService2.getRepository().createQueryBuilder(test2);

        testService2.setJoins(test2, qb, {
            joinType: 'leftJoinAndSelect'
        });

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
            SELECT
            '${test2}'.'id'         AS '${test2}_id', 
            '${test2}'.'deleted_at' AS '${test2}_deleted_at', 
            '${test2}'.'test'       AS '${test2}_test', 
            '${test2}'.'testB'      AS '${test2}_testB', 
            
            '${test}'.'id'         AS '${test}_id', 
            '${test}'.'name'       AS '${test}_name', 
            '${test}'.'created_at' AS '${test}_created_at', 
            '${test}'.'updated_at' AS '${test}_updated_at', 
            '${test}'.'deleted_at' AS '${test}_deleted_at', 

            '${testB}'.'id'         AS '${testB}_id', 
            '${testB}'.'name'       AS '${testB}_name', 
            '${testB}'.'created_at' AS '${testB}_created_at', 
            '${testB}'.'updated_at' AS '${testB}_updated_at', 
            '${testB}'.'deleted_at' AS '${testB}_deleted_at' 

            FROM 'Test2' '${test2}'
            LEFT JOIN 'Test' '${test}'  ON '${test}'.'id'='${test2}'.'test'
                AND ('${test}'.'deleted_at' IS NULL)
            LEFT JOIN 'Test' '${testB}' ON '${testB}'.'id'='${test2}'.'testB'
                AND ('${testB}'.'deleted_at' IS NULL)
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(await qb.getCount()).to.be.eq(1);
    });

    it('47. setJoins', async (): Promise<void> => {
        const test2: string = 'test2';
        const test: string = `${test2}Test`;
        const testB: string = `${test2}TestB`;

        const qb: SelectQueryBuilder<Test2> = testService2.getRepository().createQueryBuilder(test2);

        testService2.setJoins(test2, qb, {
            ignore: ['other']
        });

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
            SELECT
            '${test2}'.'id'         AS '${test2}_id', 
            '${test2}'.'deleted_at' AS '${test2}_deleted_at', 
            '${test2}'.'test'       AS '${test2}_test', 
            '${test2}'.'testB'      AS '${test2}_testB', 
            
            '${test}'.'id'         AS '${test}_id', 
            '${test}'.'name'       AS '${test}_name', 
            '${test}'.'created_at' AS '${test}_created_at', 
            '${test}'.'updated_at' AS '${test}_updated_at', 
            '${test}'.'deleted_at' AS '${test}_deleted_at', 

            '${testB}'.'id'         AS '${testB}_id', 
            '${testB}'.'name'       AS '${testB}_name', 
            '${testB}'.'created_at' AS '${testB}_created_at', 
            '${testB}'.'updated_at' AS '${testB}_updated_at', 
            '${testB}'.'deleted_at' AS '${testB}_deleted_at' 

            FROM 'Test2' '${test2}'
            INNER JOIN 'Test' '${test}'  ON '${test}'.'id'='${test2}'.'test'
            INNER JOIN 'Test' '${testB}' ON '${testB}'.'id'='${test2}'.'testB'
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(await qb.getCount()).to.be.eq(1);
    });

    it('48. setJoins', async (): Promise<void> => {
        const test2: string = 'test2';

        const qb: SelectQueryBuilder<Test2> = testService2.getRepository().createQueryBuilder(test2);

        testService2.setJoins(test2, qb, {
            only: 'other'
        });

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
            SELECT
           '${test2}'.'id'           AS 'test2_id', 
           '${test2}'.'deleted_at'   AS 'test2_deleted_at', 
           '${test2}'.'test'         AS 'test2_test', 
           '${test2}'.'testB'        AS 'test2_testB' 

            FROM 'Test2' '${test2}'
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(await qb.getCount()).to.be.eq(1);
    });

    it('49. setJoins', async (): Promise<void> => {
        const test2: string = 'test2';
        const test: string = `${test2}Test`;
        const testB: string = `${test2}TestB`;

        const qb: SelectQueryBuilder<Test2> = testService2.getRepository().createQueryBuilder(test2);

        testService.setDeletedField(undefined);

        testService2.setJoins(test2, qb, {});

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
            SELECT
            '${test2}'.'id'         AS '${test2}_id', 
            '${test2}'.'deleted_at' AS '${test2}_deleted_at', 
            '${test2}'.'test'       AS '${test2}_test', 
            '${test2}'.'testB'      AS '${test2}_testB', 
            
            '${test}'.'id'         AS '${test}_id', 
            '${test}'.'name'       AS '${test}_name', 
            '${test}'.'created_at' AS '${test}_created_at', 
            '${test}'.'updated_at' AS '${test}_updated_at', 
            '${test}'.'deleted_at' AS '${test}_deleted_at', 

            '${testB}'.'id'         AS '${testB}_id', 
            '${testB}'.'name'       AS '${testB}_name', 
            '${testB}'.'created_at' AS '${testB}_created_at', 
            '${testB}'.'updated_at' AS '${testB}_updated_at', 
            '${testB}'.'deleted_at' AS '${testB}_deleted_at' 

            FROM 'Test2' '${test2}'
            INNER JOIN 'Test' '${test}'  ON '${test}'.'id'='${test2}'.'test' 
            INNER JOIN 'Test' '${testB}' ON '${testB}'.'id'='${test2}'.'testB'
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(await qb.getCount()).to.be.eq(1);

        testService.setDeletedField('deletedAt');
    });

    it('50. setJoins', async (): Promise<void> => {
        const test2: string = 'test2';
        const test: string = `${test2}Test`;
        const testB: string = `${test2}TestB`;

        const qb: SelectQueryBuilder<Test2> = testService2.getRepository().createQueryBuilder(test2);

        testService2.setDependent(true);

        testService2.setJoins(test2, qb, {});

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
            SELECT
            '${test2}'.'id'         AS '${test2}_id', 
            '${test2}'.'deleted_at' AS '${test2}_deleted_at', 
            '${test2}'.'test'       AS '${test2}_test', 
            '${test2}'.'testB'      AS '${test2}_testB', 
            
            '${test}'.'id'         AS '${test}_id', 
            '${test}'.'name'       AS '${test}_name', 
            '${test}'.'created_at' AS '${test}_created_at', 
            '${test}'.'updated_at' AS '${test}_updated_at', 
            '${test}'.'deleted_at' AS '${test}_deleted_at', 

            '${testB}'.'id'         AS '${testB}_id', 
            '${testB}'.'name'       AS '${testB}_name', 
            '${testB}'.'created_at' AS '${testB}_created_at', 
            '${testB}'.'updated_at' AS '${testB}_updated_at', 
            '${testB}'.'deleted_at' AS '${testB}_deleted_at' 

            FROM 'Test2' '${test2}'
            INNER JOIN 'Test' '${test}'  ON '${test}'.'id'='${test2}'.'test' 
            INNER JOIN 'Test' '${testB}' ON '${testB}'.'id'='${test2}'.'testB'
            WHERE '${test}'.'deleted_at' IS NULL
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(await qb.getCount()).to.be.eq(1);

        testService2.setDependent(false);
    });

    it('51. setJoins', async (): Promise<void> => {
        const test2: string = 'test2';
        const test: string = `${test2}Test`;
        const testB: string = `${test2}TestB`;

        const qb: SelectQueryBuilder<Test2> = testService2.getRepository().createQueryBuilder(test2);

        testService2.setJoins(test2, qb, {
            andWhere: {
                'test2.test': [
                    'test2Test.id = :id', {
                        id: 1
                    }
                ]
            }
        });

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
            SELECT
            '${test2}'.'id'         AS '${test2}_id', 
            '${test2}'.'deleted_at' AS '${test2}_deleted_at', 
            '${test2}'.'test'       AS '${test2}_test', 
            '${test2}'.'testB'      AS '${test2}_testB', 
            
            '${test}'.'id'         AS '${test}_id', 
            '${test}'.'name'       AS '${test}_name', 
            '${test}'.'created_at' AS '${test}_created_at', 
            '${test}'.'updated_at' AS '${test}_updated_at', 
            '${test}'.'deleted_at' AS '${test}_deleted_at', 

            '${testB}'.'id'         AS '${testB}_id', 
            '${testB}'.'name'       AS '${testB}_name', 
            '${testB}'.'created_at' AS '${testB}_created_at', 
            '${testB}'.'updated_at' AS '${testB}_updated_at', 
            '${testB}'.'deleted_at' AS '${testB}_deleted_at' 

            FROM 'Test2' '${test2}'
            INNER JOIN 'Test' '${test}'  ON '${test}'.'id'='${test2}'.'test'
                AND ('${test}'.'id' = ?) 
            INNER JOIN 'Test' '${testB}' ON '${testB}'.'id'='${test2}'.'testB'
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(await qb.getCount()).to.be.eq(1);
    });

    it('52. setJoins', async (): Promise<void> => {
        const test: string = 'test';
        const test2: string = `${test}Test2`;
        const testB: string = `${test2}TestB`;

        const qb: SelectQueryBuilder<Test> = testService.getRepository().createQueryBuilder(test);

        testService.setDependent(true);

        testService.setJoins(test, qb, {
            subitems: ['tests'],
            joinType: 'innerJoinAndSelect',
            andWhere: {
                'test.tests': [
                    'testTest2.id = :id', {
                        id: 1
                    }
                ]
            }
        });

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
            SELECT
            '${test}'.'id'         AS '${test}_id', 
            '${test}'.'name'       AS '${test}_name', 
            '${test}'.'created_at' AS '${test}_created_at', 
            '${test}'.'updated_at' AS '${test}_updated_at', 
            '${test}'.'deleted_at' AS '${test}_deleted_at', 

            '${test2}'.'id'         AS '${test2}_id', 
            '${test2}'.'deleted_at' AS '${test2}_deleted_at', 
            '${test2}'.'test'       AS '${test2}_test', 
            '${test2}'.'testB'      AS '${test2}_testB', 

            '${testB}'.'id'         AS '${testB}_id', 
            '${testB}'.'name'       AS '${testB}_name', 
            '${testB}'.'created_at' AS '${testB}_created_at', 
            '${testB}'.'updated_at' AS '${testB}_updated_at', 
            '${testB}'.'deleted_at' AS '${testB}_deleted_at' 

            FROM 'Test' '${test}'
            INNER JOIN 'Test2' '${test2}' ON '${test2}'.'test'='test'.'id'
                AND ('testTest2'.'id' = ?)
            LEFT JOIN 'Test'  '${testB}' ON '${testB}'.'id'='${test2}'.'testB'
                AND ('${testB}'.'deleted_at' IS NULL)
            WHERE '${test2}'.'id' > 0
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(await qb.getCount()).to.be.eq(1);

        testService.setDependent(false);
    });

    it('53. setJoins', async (): Promise<void> => {
        const test2: string = 'test2';
        const test: string = `${test2}Test`;
        const testB: string = `${test2}TestB`;

        const qb: SelectQueryBuilder<Test2> = testService2.getRepository().createQueryBuilder(test2);

        testService2.setParentJoinType('leftJoinAndSelect');

        testService2.setJoins(test2, qb, {
            sort: {
                'test.id': 1
            }
        });

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
            SELECT
            '${test2}'.'id'         AS '${test2}_id', 
            '${test2}'.'deleted_at' AS '${test2}_deleted_at', 
            '${test2}'.'test'       AS '${test2}_test', 
            '${test2}'.'testB'      AS '${test2}_testB', 
            
            '${test}'.'id'         AS '${test}_id', 
            '${test}'.'name'       AS '${test}_name', 
            '${test}'.'created_at' AS '${test}_created_at', 
            '${test}'.'updated_at' AS '${test}_updated_at', 
            '${test}'.'deleted_at' AS '${test}_deleted_at', 

            '${testB}'.'id'         AS '${testB}_id', 
            '${testB}'.'name'       AS '${testB}_name', 
            '${testB}'.'created_at' AS '${testB}_created_at', 
            '${testB}'.'updated_at' AS '${testB}_updated_at', 
            '${testB}'.'deleted_at' AS '${testB}_deleted_at' 

            FROM 'Test2' '${test2}'
            LEFT JOIN 'Test' '${test}'  ON '${test}'.'id'='${test2}'.'test'
                AND ('${test}'.'deleted_at' IS NULL)
            LEFT JOIN 'Test' '${testB}' ON '${testB}'.'id'='${test2}'.'testB'
                AND ('${testB}'.'deleted_at' IS NULL)
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(await qb.getCount()).to.be.eq(1);

        testService2.deleteParentJoinType();
    });

    it('54. setJoins', async (): Promise<void> => {
        const test2: string = 'test2';
        const testB: string = `${test2}TestB`;

        const qb: SelectQueryBuilder<Test2> = testService2.getRepository().createQueryBuilder(test2);

        testService2.setJoins(test2, qb, {
            ignore: ['test2Test']
        });

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
            SELECT
            '${test2}'.'id'         AS '${test2}_id', 
            '${test2}'.'deleted_at' AS '${test2}_deleted_at', 
            '${test2}'.'test'       AS '${test2}_test', 
            '${test2}'.'testB'      AS '${test2}_testB', 

            '${testB}'.'id'         AS '${testB}_id', 
            '${testB}'.'name'       AS '${testB}_name', 
            '${testB}'.'created_at' AS '${testB}_created_at', 
            '${testB}'.'updated_at' AS '${testB}_updated_at', 
            '${testB}'.'deleted_at' AS '${testB}_deleted_at' 

            FROM 'Test2' '${test2}'
            INNER JOIN 'Test' '${testB}' ON '${testB}'.'id'='${test2}'.'testB'
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(await qb.getCount()).to.be.eq(1);
    });

    it('55. setPagination', async (): Promise<void> => {
        expect((): void => {
            testService.setPagination(undefined, {});
        }).to.throw('Query builder was not provided.');
    });

    it('56. setPagination', async (): Promise<void> => {
        const test: string = 'test';

        const qb: SelectQueryBuilder<Test> = testService.getRepository().createQueryBuilder(test);

        expect((): void => {
            testService.setPagination(qb, undefined);
        }).to.throw('Service options was not provided.');
    });

    it('57. setPagination', async (): Promise<void> => {
        const test: string = 'test';

        const qb: SelectQueryBuilder<Test> = testService.getRepository().createQueryBuilder(test);

        testService.setPagination(qb, {});

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
            SELECT
            '${test}'.'id'         AS '${test}_id', 
            '${test}'.'name'       AS '${test}_name',
            '${test}'.'created_at' AS '${test}_created_at',
            '${test}'.'updated_at' AS '${test}_updated_at',
            '${test}'.'deleted_at' AS '${test}_deleted_at' 
            FROM 'Test' '${test}'
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect((await qb.getMany()).length).to.be.eq(1);
    });

    it('58. setPagination', async (): Promise<void> => {
        const test: string = 'test';

        const qb: SelectQueryBuilder<Test> = testService.getRepository().createQueryBuilder(test);

        const paginate: Paginate = new Paginate(app, {
            _limit: 10,
            _skip: 2
        });

        testService.setPagination(qb, {
            paginate
        });

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
        SELECT
        '${test}'.'id'         AS '${test}_id', 
        '${test}'.'name'       AS '${test}_name',
        '${test}'.'created_at' AS '${test}_created_at',
        '${test}'.'updated_at' AS '${test}_updated_at',
        '${test}'.'deleted_at' AS '${test}_deleted_at' 
        FROM 'Test' '${test}' LIMIT 10 OFFSET 2
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect((await qb.getMany()).length).to.be.eq(0);
    });

    it('59. list', async (): Promise<void> => {
        let serviceError: any;
        try {
            await testService.list(undefined, (qb: SelectQueryBuilder<Test>): void => {
                //
            }, {});
        }
        catch (err: any) {
            serviceError = err;
        }

        expect(serviceError).to.exist;
        expect(serviceError.message).to.be.eq('Alias was not provided.');
    });

    it('60. list', async (): Promise<void> => {
        const test: string = 'test';

        let serviceError: any;
        try {
            await testService.list(test, undefined, {});
        }
        catch (err: any) {
            serviceError = err;
        }

        expect(serviceError).to.exist;
        expect(serviceError.message).to.be.eq('Query parser was not provided.');
    });

    it('61. list', async (): Promise<void> => {
        const test: string = 'test';

        let serviceError: any;
        try {
            await testService.list(test, (qb: SelectQueryBuilder<Test>): void => {
                //
            }, undefined);
        }
        catch (err: any) {
            serviceError = err;
        }

        expect(serviceError).to.exist;
        expect(serviceError.message).to.be.eq('Service options was not provided.');
    });

    it('62. list', async (): Promise<void> => {
        const test: string = 'test';

        let sql: string;
        testService.debug.log = (data: string): void => {
            sql = data;
        };

        const items: Test[] = await testService.list(test, (qb: SelectQueryBuilder<Test>): void => {
            qb.andWhere(`${test}.id = :id`, {
                id: 1
            });
        }, {});

        expect(sql.replace(/\s+/ig, ' ')).to.contain(`
            SELECT
            '${test}'.'id'         AS '${test}_id', 
            '${test}'.'name'       AS '${test}_name',
            '${test}'.'created_at' AS '${test}_created_at',
            '${test}'.'updated_at' AS '${test}_updated_at',
            '${test}'.'deleted_at' AS '${test}_deleted_at' 
            FROM 'Test' '${test}' 
            WHERE '${test}'.'id' = ?
            AND '${test}'.'deleted_at' IS NULL
            ORDER BY 'test'.'name' ASC
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(items.length).to.be.eq(1);
    });

    it('63. count', async (): Promise<void> => {
        let serviceError: any;
        try {
            await testService.count(undefined, (qb: SelectQueryBuilder<Test>): void => {
                //
            }, {});
        }
        catch (err: any) {
            serviceError = err;
        }

        expect(serviceError).to.exist;
        expect(serviceError.message).to.be.eq('Alias was not provided.');
    });

    it('64. count', async (): Promise<void> => {
        const test: string = 'test';

        let serviceError: any;
        try {
            await testService.count(test, undefined, {});
        }
        catch (err: any) {
            serviceError = err;
        }

        expect(serviceError).to.exist;
        expect(serviceError.message).to.be.eq('Query parser was not provided.');
    });

    it('65. count', async (): Promise<void> => {
        const test: string = 'test';

        let serviceError: any;
        try {
            await testService.count(test, (qb: SelectQueryBuilder<Test>): void => {
                //
            }, undefined);
        }
        catch (err: any) {
            serviceError = err;
        }

        expect(serviceError).to.exist;
        expect(serviceError.message).to.be.eq('Service options was not provided.');
    });

    it('66. count', async (): Promise<void> => {
        const test: string = 'test';

        let sql: string;
        testService.debug.log = (data: string): void => {
            sql = data;
        };

        const total: number = await testService.count(test, (qb: SelectQueryBuilder<Test>): void => {
            qb.andWhere(`${test}.id = :id`, {
                id: 1
            });
        }, {});

        expect(sql.replace(/\s+/ig, ' ')).to.contain(`
            SELECT
            '${test}'.'id'         AS '${test}_id', 
            '${test}'.'name'       AS '${test}_name',
            '${test}'.'created_at' AS '${test}_created_at',
            '${test}'.'updated_at' AS '${test}_updated_at',
            '${test}'.'deleted_at' AS '${test}_deleted_at' 
            FROM 'Test' '${test}' 
            WHERE '${test}'.'id' = ?
            AND '${test}'.'deleted_at' IS NULL
            ORDER BY '${test}'.'name' ASC
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(total).to.be.eq(1);
    });

    it('67. listAndCount', async (): Promise<void> => {
        let serviceError: any;
        try {
            await testService.listAndCount(undefined, (qb: SelectQueryBuilder<Test>): void => {
                //
            }, {});
        }
        catch (err: any) {
            serviceError = err;
        }

        expect(serviceError).to.exist;
        expect(serviceError.message).to.be.eq('Alias was not provided.');
    });

    it('68. listAndCount', async (): Promise<void> => {
        const test: string = 'test';

        let serviceError: any;
        try {
            await testService.listAndCount(test, undefined, {});
        }
        catch (err: any) {
            serviceError = err;
        }

        expect(serviceError).to.exist;
        expect(serviceError.message).to.be.eq('Query parser was not provided.');
    });

    it('69. listAndCount', async (): Promise<void> => {
        const test: string = 'test';

        let serviceError: any;
        try {
            await testService.listAndCount(test, (qb: SelectQueryBuilder<Test>): void => {
                //
            }, undefined);
        }
        catch (err: any) {
            serviceError = err;
        }

        expect(serviceError).to.exist;
        expect(serviceError.message).to.be.eq('Service options was not provided.');
    });

    it('70. listAndCount', async (): Promise<void> => {
        const test: string = 'test';

        let sql: string;
        testService.debug.log = (data: string): void => {
            sql = data;
        };

        const [items, total]: [Test[], number] = await testService.listAndCount(test, (qb: SelectQueryBuilder<Test>): void => {
            qb.andWhere(`${test}.id = :id`, {
                id: 1
            });
        }, {});

        expect(sql.replace(/\s+/ig, ' ')).to.contain(`
            SELECT
            '${test}'.'id'         AS '${test}_id', 
            '${test}'.'name'       AS '${test}_name',
            '${test}'.'created_at' AS '${test}_created_at',
            '${test}'.'updated_at' AS '${test}_updated_at',
            '${test}'.'deleted_at' AS '${test}_deleted_at' 
            FROM 'Test' '${test}'
            WHERE '${test}'.'id' = ? 
            AND '${test}'.'deleted_at' IS NULL 
            ORDER BY '${test}'.'name' ASC
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(items.length).to.be.eq(1);
        expect(total).to.be.eq(1);
    });

    it('71. listBy', async (): Promise<void> => {
        let serviceError: any;
        try {
            await testService.listBy(undefined, 'id', 1, {});
        }
        catch (err: any) {
            serviceError = err;
        }

        expect(serviceError).to.exist;
        expect(serviceError.message).to.be.eq('Alias was not provided.');
    });

    it('72. listBy', async (): Promise<void> => {
        const test: string = 'test';

        let serviceError: any;
        try {
            await testService.listBy(test, undefined, 1, {});
        }
        catch (err: any) {
            serviceError = err;
        }

        expect(serviceError).to.exist;
        expect(serviceError.message).to.be.eq('Field name was not provided.');
    });

    it('73. listBy', async (): Promise<void> => {
        const test: string = 'test';

        let serviceError: any;
        try {
            await testService.listBy(test, 'id', 1, undefined);
        }
        catch (err: any) {
            serviceError = err;
        }

        expect(serviceError).to.exist;
        expect(serviceError.message).to.be.eq('Service options was not provided.');
    });

    it('74. listBy', async (): Promise<void> => {
        const test: string = 'test';

        let sql: string;
        testService.debug.log = (data: string): void => {
            sql = data;
        };

        const items: Test[] = await testService.listBy(test, 'id', 1, {});

        expect(sql.replace(/\s+/ig, ' ')).to.contain(`
            SELECT
            '${test}'.'id'         AS '${test}_id', 
            '${test}'.'name'       AS '${test}_name',
            '${test}'.'created_at' AS '${test}_created_at',
            '${test}'.'updated_at' AS '${test}_updated_at',
            '${test}'.'deleted_at' AS '${test}_deleted_at' 
            FROM 'Test' '${test}'
            WHERE '${test}'.'id' = ?
            AND '${test}'.'deleted_at' IS NULL
            ORDER BY '${test}'.'name' ASC
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(items.length).to.be.eq(1);
    });

    it('75. findById', async (): Promise<void> => {
        let serviceError: any;
        try {
            await testService.findById(undefined, 1, {});
        }
        catch (err: any) {
            serviceError = err;
        }

        expect(serviceError).to.exist;
        expect(serviceError.message).to.be.eq('Alias was not provided.');
    });

    it('76. findById', async (): Promise<void> => {
        const test: string = 'test';

        let serviceError: any;
        try {
            await testService.findById(test, undefined, {});
        }
        catch (err: any) {
            serviceError = err;
        }

        expect(serviceError).to.exist;
        expect(serviceError.message).to.be.eq('ID was not provided.');
    });

    it('77. findById', async (): Promise<void> => {
        const test: string = 'test';

        let serviceError: any;
        try {
            await testService.findById(test, 1, undefined);
        }
        catch (err: any) {
            serviceError = err;
        }

        expect(serviceError).to.exist;
        expect(serviceError.message).to.be.eq('Service options was not provided.');
    });

    it('78. findById', async (): Promise<void> => {
        const test: string = 'test';

        let sql: string;
        testService.debug.log = (data: string): void => {
            sql = data;
        };

        const item: Test = await testService.findById('test', 1, {});

        expect(sql.replace(/\s+/ig, ' ')).to.contain(`
            SELECT
            '${test}'.'id'         AS '${test}_id', 
            '${test}'.'name'       AS '${test}_name',
            '${test}'.'created_at' AS '${test}_created_at',
            '${test}'.'updated_at' AS '${test}_updated_at',
            '${test}'.'deleted_at' AS '${test}_deleted_at' 
            FROM 'Test' '${test}'
            WHERE '${test}'.'id' = ?
            AND '${test}'.'deleted_at' IS NULL
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(item).to.exist;
    });

    it('79. findBy', async (): Promise<void> => {
        let serviceError: any;
        try {
            await testService.findBy(undefined, 'id', 1, {});
        }
        catch (err: any) {
            serviceError = err;
        }

        expect(serviceError).to.exist;
        expect(serviceError.message).to.be.eq('Alias was not provided.');
    });

    it('80. findBy', async (): Promise<void> => {
        const test: string = 'test';

        let serviceError: any;
        try {
            await testService.findBy(test, undefined, 1, {});
        }
        catch (err: any) {
            serviceError = err;
        }

        expect(serviceError).to.exist;
        expect(serviceError.message).to.be.eq('Field name was not provided.');
    });

    it('81. findBy', async (): Promise<void> => {
        const test: string = 'test';

        let serviceError: any;
        try {
            await testService.findBy(test, 'id', 1, undefined);
        }
        catch (err: any) {
            serviceError = err;
        }

        expect(serviceError).to.exist;
        expect(serviceError.message).to.be.eq('Service options was not provided.');
    });

    it('82. findBy', async (): Promise<void> => {
        const test: string = 'test';

        let sql: string;
        testService.debug.log = (data: string): void => {
            sql = data;
        };

        const item: Test = await testService.findBy('test', 'id', 1, {});

        expect(sql.replace(/\s+/ig, ' ')).to.contain(`
            SELECT
            '${test}'.'id'         AS '${test}_id', 
            '${test}'.'name'       AS '${test}_name',
            '${test}'.'created_at' AS '${test}_created_at',
            '${test}'.'updated_at' AS '${test}_updated_at',
            '${test}'.'deleted_at' AS '${test}_deleted_at' 
            FROM 'Test' '${test}'
            WHERE '${test}'.'id' = ?
            AND '${test}'.'deleted_at' IS NULL
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(item).to.exist;
    });

    it('83. find', async (): Promise<void> => {
        let serviceError: any;
        try {
            await testService.find(undefined, (qb: SelectQueryBuilder<Test>): void => {
                //
            }, {});
        }
        catch (err: any) {
            serviceError = err;
        }

        expect(serviceError).to.exist;
        expect(serviceError.message).to.be.eq('Alias was not provided.');
    });

    it('84. find', async (): Promise<void> => {
        const test: string = 'test';

        let serviceError: any;
        try {
            await testService.find(test, undefined, {});
        }
        catch (err: any) {
            serviceError = err;
        }

        expect(serviceError).to.exist;
        expect(serviceError.message).to.be.eq('Query parser was not provided.');
    });

    it('85. find', async (): Promise<void> => {
        const test: string = 'test';

        let serviceError: any;
        try {
            await testService.find(test, (qb: SelectQueryBuilder<Test>): void => {
                //
            }, undefined);
        }
        catch (err: any) {
            serviceError = err;
        }

        expect(serviceError).to.exist;
        expect(serviceError.message).to.be.eq('Service options was not provided.');
    });

    it('86. find', async (): Promise<void> => {
        const test: string = 'test';

        let sql: string;
        testService.debug.log = (data: string): void => {
            sql = data;
        };

        const item: Test = await testService.find('test', (qb: SelectQueryBuilder<Test>): void => {
            qb.andWhere(`${test}.id = :id`, {
                id: 1
            });
        }, {});

        expect(sql.replace(/\s+/ig, ' ')).to.contain(`
            SELECT
            '${test}'.'id'         AS '${test}_id', 
            '${test}'.'name'       AS '${test}_name',
            '${test}'.'created_at' AS '${test}_created_at',
            '${test}'.'updated_at' AS '${test}_updated_at',
            '${test}'.'deleted_at' AS '${test}_deleted_at' 
            FROM 'Test' '${test}'
            WHERE '${test}'.'id' = ?
            AND '${test}'.'deleted_at' IS NULL
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(item).to.exist;
    });

    it('87. save', async (): Promise<void> => {
        let item: Test = new Test();
        item.name = 'test';

        item = await testService.save(item);

        expect(item).to.exist;
        expect(item.name).to.be.eq('test');
        expect(item.createdAt).to.exist;
        expect(item.updatedAt).to.not.exist;
        expect(await testService.findById('test', item.id, {})).to.exist;
    });

    it('88. save', async (): Promise<void> => {
        expect(await testService.save(undefined)).to.be.undefined;
    });

    it('89. save', async (): Promise<void> => {
        let item: Test = new Test();
        item.name = 'test';

        item = await testService.save(item);

        item = await testService.save(item);

        expect(item).to.exist;
        expect(item.name).to.be.eq('test');
        expect(item.createdAt).to.exist;
        expect(item.updatedAt).to.exist;
    });

    it('90. save', async (): Promise<void> => {
        let id: number;
        let err: Error;
        try {
            await TypeOrmManager.getConnection(connectionName).transaction(async (transactionEntityManager: EntityManager): Promise<void> => {
                let item: Test = new Test();
                item.name = 'test';

                item = await testService.save(item, transactionEntityManager);
                id = item.id;

                throw Error('Test');
            });
        }
        catch (error: any) {
            err = error;
        }

        expect(id).to.exist;
        expect(err).to.exist.and.have.property('message').eq('Test');
        expect(await testService.findById('test', id, {})).to.not.exist;
    });

    it('91. remove', async (): Promise<void> => {
        let item: Test = new Test();
        item.name = 'test';

        item = await testService.save(item);

        expect(item).to.exist;

        await testService.remove(item);

        expect(await testService.findById('test', item.id, {})).to.not.exist;
    });

    it('92. remove', async (): Promise<void> => {
        let item: Test = new Test();
        item.name = 'test';

        item = await testService.save(item);
        const id: number = item.id;

        let err: Error;
        try {
            await TypeOrmManager.getConnection(connectionName).transaction(async (transactionEntityManager: EntityManager): Promise<void> => {
                await testService.remove(item, transactionEntityManager);

                throw Error('Test');
            });
        }
        catch (error: any) {
            err = error;
        }

        expect(id).to.exist;
        expect(err).to.exist.and.have.property('message').eq('Test');
        expect(await testService.findById('test', id, {})).to.exist;
    });

    it('93. setJoins', async (): Promise<void> => {
        const test3: string = 'test3';
        const test2: string = `${test3}Test2`;
        const test: string = `${test2}Test`;
        const testB: string = `${test2}TestB`;

        const qb: SelectQueryBuilder<Test3> = testService3.getRepository().createQueryBuilder(test3);

        testService3.setJoins(test3, qb, {});

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
            SELECT
            '${test3}'.'id'         AS '${test3}_id', 
            '${test3}'.'test'       AS '${test3}_test', 

            '${test2}'.'id'         AS '${test2}_id', 
            '${test2}'.'deleted_at' AS '${test2}_deleted_at', 
            '${test2}'.'test'       AS '${test2}_test', 
            '${test2}'.'testB'      AS '${test2}_testB', 
            
            '${test}'.'id'         AS '${test}_id', 
            '${test}'.'name'       AS '${test}_name', 
            '${test}'.'created_at' AS '${test}_created_at', 
            '${test}'.'updated_at' AS '${test}_updated_at', 
            '${test}'.'deleted_at' AS '${test}_deleted_at', 

            '${testB}'.'id'         AS '${testB}_id', 
            '${testB}'.'name'       AS '${testB}_name', 
            '${testB}'.'created_at' AS '${testB}_created_at', 
            '${testB}'.'updated_at' AS '${testB}_updated_at', 
            '${testB}'.'deleted_at' AS '${testB}_deleted_at' 

            FROM 'Test3' '${test3}'
            INNER JOIN 'Test2' '${test2}'  ON '${test2}'.'id'='${test3}'.'test' 
            INNER JOIN 'Test' '${test}'  ON '${test}'.'id'='${test2}'.'test' 
            INNER JOIN 'Test' '${testB}' ON '${testB}'.'id'='${test2}'.'testB'
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(await qb.getCount()).to.be.eq(1);
    });
});
