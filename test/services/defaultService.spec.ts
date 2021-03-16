import App, { AppInfo } from '@dfgpublicidade/node-app-module';
import Paginate from '@dfgpublicidade/node-pagination-module';
import { expect } from 'chai';
import { after, before, describe, it } from 'mocha';
import { Column, Connection, Entity, EntityManager, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, SelectQueryBuilder } from 'typeorm';
import { DefaultService, JoinType, TypeOrmManager } from '../../src';

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
}

class TypeOrmManagerTest extends TypeOrmManager {
    protected static entities: any[] = [
        Test,
        Test2
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

    public setDependent(dependant: boolean): void {
        this.parentEntities[0].dependent = dependant;
    }

    public setDefaultQuery(alias: string, qb: any): void {
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
}

describe('DefaultService', (): void => {
    const connectionName: string = 'mysql';
    let connection: Connection;

    let testService: TestService;
    let testService2: TestService2;
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
            INSERT INTO Test(name) VALUES ('test')
        `);
        await connection.manager.query(`
            INSERT INTO Test2(test, testB) VALUES (1, 1)
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
            },
            connectionName: undefined,
            db: undefined
        });
    });

    after(async (): Promise<void> => {
        await connection.manager.query('DROP TABLE Test2');
        await connection.manager.query('DROP TABLE Test');

        await TypeOrmManagerTest.close(options.name);
    });

    it('1. constructor', async (): Promise<void> => {
        testService = TestService.getInstance(connectionName);
        testService2 = TestService2.getInstance(connectionName);

        expect(testService).to.exist;
        expect(testService2).to.exist;
    });

    it('2. getRepository', async (): Promise<void> => {
        let connectionError: any;
        try {
            await TestService.getInstance('invalid').getRepository().query('SELECT 1');
        }
        catch (error: any) {
            connectionError = error;
        }

        expect(connectionError).to.exist;
        expect(connectionError.message).to.contain('Connection or repository not found');
    });

    it('3. getRepository', async (): Promise<void> => {
        expect((await testService.getRepository().query('SELECT 1 AS result'))[0].result).to.be.eq('1');
    });

    it('4. translateParams', async (): Promise<void> => {
        expect(testService.translateParams(undefined)).to.be.empty;
    });

    it('5. translateParams', async (): Promise<void> => {
        expect(testService2.translateParams('test2')).to.be.eq('test2');
    });

    it('6. translateParams', async (): Promise<void> => {
        expect(testService2.translateParams('test2.id')).to.be.eq('test2.id');
    });

    it('7. translateParams', async (): Promise<void> => {
        expect(testService2.translateParams('test2.test.id')).to.be.eq('test2Test.id');
    });

    it('8. translateParams', async (): Promise<void> => {
        expect(testService2.translateParams('test2.invalid.id')).to.be.undefined;
    });

    it('9. translateParams', async (): Promise<void> => {
        expect(testService2.translateParams('test2.test.invalid.id')).to.be.undefined;
    });

    it('10. translateParams', async (): Promise<void> => {
        expect(testService.translateParams('test.tests.id')).to.be.eq('testTest2.id');
    });

    it('11. translateParams', async (): Promise<void> => {
        expect(testService.translateParams('test.tests.invalid.id')).to.be.undefined;
    });

    it('12. setDefaultQuery', async (): Promise<void> => {
        const qb: SelectQueryBuilder<Test> = testService.getRepository().createQueryBuilder('test');

        testService.setDefaultQuery('test', qb, {});

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
            SELECT 'test'.'id' AS 'test_id', 'test'.'name' AS 'test_name', 'test'.'created_at' AS 'test_created_at', 'test'.'updated_at' AS 'test_updated_at', 
            'test'.'deleted_at' AS 'test_deleted_at' 
            FROM 'Test' 'test' 
            WHERE 'test'.'deleted_at' IS NULL
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(await qb.getCount()).to.be.eq(1);
    });

    it('13. setDefaultQuery', async (): Promise<void> => {
        const qb: SelectQueryBuilder<Test2> = testService2.getRepository().createQueryBuilder('test2');

        testService2.setDefaultQuery('test2', qb);

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
            SELECT 'test2'.'id' AS 'test2_id', 'test2'.'deleted_at' AS 'test2_deleted_at', 'test2'.'test' AS 'test2_test', 'test2'.'testB' 
            AS 'test2_testB' FROM 'Test2' 'test2' WHERE 'test2'.'id' > 0
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(await qb.getCount()).to.be.eq(1);
    });

    it('14. setDefaultQuery', async (): Promise<void> => {
        const qb: SelectQueryBuilder<Test2> = testService2.getRepository().createQueryBuilder('test2');

        testService2.setDependent(true);

        testService2.setDefaultQuery('test2', qb);
        testService2.setJoins('test2', qb, {});

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
            SELECT 'test2'.'id' AS 'test2_id', 'test2'.'deleted_at' AS 'test2_deleted_at', 'test2'.'test' AS 'test2_test', 'test2'.'testB' AS 'test2_testB', 
            'test2Test'.'id' AS 'test2Test_id', 'test2Test'.'name' AS 'test2Test_name', 'test2Test'.'created_at' AS 'test2Test_created_at', 
            'test2Test'.'updated_at' AS 'test2Test_updated_at', 'test2Test'.'deleted_at' AS 'test2Test_deleted_at', 
            'test2TestB'.'id' AS 'test2TestB_id', 'test2TestB'.'name' AS 'test2TestB_name', 'test2TestB'.'created_at' AS 'test2TestB_created_at', 
            'test2TestB'.'updated_at' AS 'test2TestB_updated_at', 'test2TestB'.'deleted_at' AS 'test2TestB_deleted_at' 
            FROM 'Test2' 'test2' 
            INNER JOIN 'Test' 'test2Test' ON 'test2Test'.'id'='test2'.'test' 
            INNER JOIN 'Test' 'test2TestB' ON 'test2TestB'.'id'='test2'.'testB' 
            WHERE 'test2Test'.'deleted_at' IS NULL AND 'test2'.'id' > 0
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(await qb.getCount()).to.be.eq(1);

        testService2.setDependent(false);
    });

    it('15. getSorting', async (): Promise<void> => {
        expect(testService.getSorting('test', {
            sort: {
                'test.name': 'ASC'
            }
        })).to.be.deep.eq({
            'test.name': 'ASC'
        });
    });

    it('16. getSorting', async (): Promise<void> => {
        expect(testService.getSorting('test', {})).to.be.deep.eq({
            'test.name': 'ASC'
        });
    });

    it('17. getSorting', async (): Promise<void> => {
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

    it('18. getSorting', async (): Promise<void> => {
        expect(testService2.getSorting('test2', {})).to.be.deep.eq({
            'test2Test.name': 'ASC',
            'test2TestB.name': 'ASC'
        });
    });

    it('19. getSorting', async (): Promise<void> => {
        expect(testService2.getSorting('test2', {
            ignore: ['test2Test']
        })).to.be.deep.eq({
            'test2TestB.name': 'ASC'
        });
    });

    it('20. getSorting', async (): Promise<void> => {
        testService2.setDefaultSorting({
            '$alias.title': 'ASC'
        });

        expect(testService.getSorting('test', {
            subitems: ['tests', 'others']
        })).to.be.deep.eq({
            'test.name': 'ASC',
            'testTest2.title': 'ASC',
            'testTest2TestB.name': 'ASC'
        });

        testService2.setDefaultSorting({});
    });

    it('21. getSorting', async (): Promise<void> => {
        testService2.setDefaultSorting({
            '$alias.title': 'ASC'
        });

        expect(testService.getSorting('test', {
            subitems: ['tests', 'others'],
            ignore: ['others']
        })).to.be.deep.eq({
            'test.name': 'ASC',
            'testTest2.title': 'ASC',
            'testTest2TestB.name': 'ASC'
        });

        testService2.setDefaultSorting({});
    });

    it('22. setJoins', async (): Promise<void> => {
        const qb: SelectQueryBuilder<Test> = testService.getRepository().createQueryBuilder('test');

        testService.setJoins('test', qb, {
            subitems: ['tests']
        });

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
            SELECT 'test'.'id' AS 'test_id', 'test'.'name' AS 'test_name', 'test'.'created_at' AS 'test_created_at', 
            'test'.'updated_at' AS 'test_updated_at', 'test'.'deleted_at' AS 'test_deleted_at', 
            'testTest2'.'id' AS 'testTest2_id', 'testTest2'.'deleted_at' AS 'testTest2_deleted_at', 'testTest2'.'test' AS 'testTest2_test', 
            'testTest2'.'testB' AS 'testTest2_testB', 
            'testTest2TestB'.'id' AS 'testTest2TestB_id', 'testTest2TestB'.'name' AS 'testTest2TestB_name', 'testTest2TestB'.'created_at' AS 'testTest2TestB_created_at', 
            'testTest2TestB'.'updated_at' AS 'testTest2TestB_updated_at', 'testTest2TestB'.'deleted_at' AS 'testTest2TestB_deleted_at' 
            FROM 'Test' 'test'
            LEFT JOIN 'Test2' 'testTest2' ON 'testTest2'.'test'='test'.'id'
            LEFT JOIN 'Test' 'testTest2TestB' ON 'testTest2TestB'.'id'='testTest2'.'testB'
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(await qb.getCount()).to.be.eq(1);
    });

    it('23. setJoins', async (): Promise<void> => {
        const qb: SelectQueryBuilder<Test> = testService.getRepository().createQueryBuilder('test');

        testService.setJoins('test', qb, {
            subitems: ['tests'],
            joinType: 'innerJoinAndSelect'
        });

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
            SELECT 'test'.'id' AS 'test_id', 'test'.'name' AS 'test_name', 'test'.'created_at' AS 'test_created_at', 
            'test'.'updated_at' AS 'test_updated_at', 'test'.'deleted_at' AS 'test_deleted_at', 
            'testTest2'.'id' AS 'testTest2_id', 'testTest2'.'deleted_at' AS 'testTest2_deleted_at', 'testTest2'.'test' AS 'testTest2_test', 
            'testTest2'.'testB' AS 'testTest2_testB', 
            'testTest2TestB'.'id' AS 'testTest2TestB_id', 'testTest2TestB'.'name' AS 'testTest2TestB_name', 'testTest2TestB'.'created_at' AS 'testTest2TestB_created_at', 
            'testTest2TestB'.'updated_at' AS 'testTest2TestB_updated_at', 'testTest2TestB'.'deleted_at' AS 'testTest2TestB_deleted_at' 
            FROM 'Test' 'test' 
            INNER JOIN 'Test2' 'testTest2' ON 'testTest2'.'test'='test'.'id' 
            INNER JOIN 'Test' 'testTest2TestB' ON 'testTest2TestB'.'id'='testTest2'.'testB'
            WHERE 'testTest2'.'id' > 0
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(await qb.getCount()).to.be.eq(1);
    });

    it('24. setJoins', async (): Promise<void> => {
        const qb: SelectQueryBuilder<Test> = testService.getRepository().createQueryBuilder('test');

        testService.setChildJoinType('innerJoinAndSelect');

        testService.setJoins('test', qb, {
            subitems: ['tests']
        });

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
            SELECT 'test'.'id' AS 'test_id', 'test'.'name' AS 'test_name', 'test'.'created_at' AS 'test_created_at', 
            'test'.'updated_at' AS 'test_updated_at', 'test'.'deleted_at' AS 'test_deleted_at', 
            'testTest2'.'id' AS 'testTest2_id', 'testTest2'.'deleted_at' AS 'testTest2_deleted_at', 'testTest2'.'test' AS 'testTest2_test', 
            'testTest2'.'testB' AS 'testTest2_testB', 
            'testTest2TestB'.'id' AS 'testTest2TestB_id', 'testTest2TestB'.'name' AS 'testTest2TestB_name', 'testTest2TestB'.'created_at' AS 'testTest2TestB_created_at', 
            'testTest2TestB'.'updated_at' AS 'testTest2TestB_updated_at', 'testTest2TestB'.'deleted_at' AS 'testTest2TestB_deleted_at' 
            FROM 'Test' 'test' 
            INNER JOIN 'Test2' 'testTest2' ON 'testTest2'.'test'='test'.'id' 
            INNER JOIN 'Test' 'testTest2TestB' ON 'testTest2TestB'.'id'='testTest2'.'testB'
            WHERE 'testTest2'.'id' > 0
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(await qb.getCount()).to.be.eq(1);

        testService.deleteChildJoinType();
    });

    it('25. setJoins', async (): Promise<void> => {
        const qb: SelectQueryBuilder<Test> = testService.getRepository().createQueryBuilder('test');

        testService2.setDeletedAtField('deletedAt');

        testService.setJoins('test', qb, {
            subitems: ['tests']
        });

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
            SELECT 'test'.'id' AS 'test_id', 'test'.'name' AS 'test_name', 'test'.'created_at' AS 'test_created_at', 
            'test'.'updated_at' AS 'test_updated_at', 'test'.'deleted_at' AS 'test_deleted_at', 
            'testTest2'.'id' AS 'testTest2_id', 'testTest2'.'deleted_at' AS 'testTest2_deleted_at', 'testTest2'.'test' AS 'testTest2_test', 
            'testTest2'.'testB' AS 'testTest2_testB', 
            'testTest2TestB'.'id' AS 'testTest2TestB_id', 'testTest2TestB'.'name' AS 'testTest2TestB_name', 'testTest2TestB'.'created_at' AS 'testTest2TestB_created_at', 
            'testTest2TestB'.'updated_at' AS 'testTest2TestB_updated_at', 'testTest2TestB'.'deleted_at' AS 'testTest2TestB_deleted_at' 
            FROM 'Test' 'test'
            LEFT JOIN 'Test2' 'testTest2' ON 'testTest2'.'test'='test'.'id' AND ( 'testTest2'.'deleted_at' IS NULL )
            LEFT JOIN 'Test' 'testTest2TestB' ON 'testTest2TestB'.'id'='testTest2'.'testB'
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(await qb.getCount()).to.be.eq(1);

        testService2.setDeletedAtField(undefined);
    });

    it('26. setJoins', async (): Promise<void> => {
        const qb: SelectQueryBuilder<Test> = testService.getRepository().createQueryBuilder('test');

        testService.setAndWhere('`testTest2`.`deleted_at` IS NULL');

        testService.setJoins('test', qb, {
            subitems: ['tests']
        });

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
            SELECT 'test'.'id' AS 'test_id', 'test'.'name' AS 'test_name', 'test'.'created_at' AS 'test_created_at', 
            'test'.'updated_at' AS 'test_updated_at', 'test'.'deleted_at' AS 'test_deleted_at', 
            'testTest2'.'id' AS 'testTest2_id', 'testTest2'.'deleted_at' AS 'testTest2_deleted_at', 'testTest2'.'test' AS 'testTest2_test', 
            'testTest2'.'testB' AS 'testTest2_testB', 
            'testTest2TestB'.'id' AS 'testTest2TestB_id', 'testTest2TestB'.'name' AS 'testTest2TestB_name', 'testTest2TestB'.'created_at' AS 'testTest2TestB_created_at', 
            'testTest2TestB'.'updated_at' AS 'testTest2TestB_updated_at', 'testTest2TestB'.'deleted_at' AS 'testTest2TestB_deleted_at' 
            FROM 'Test' 'test'
            LEFT JOIN 'Test2' 'testTest2' ON 'testTest2'.'test'='test'.'id' AND ( 'testTest2'.'deleted_at' IS NULL )
            LEFT JOIN 'Test' 'testTest2TestB' ON 'testTest2TestB'.'id'='testTest2'.'testB'
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(await qb.getCount()).to.be.eq(1);

        testService.deleteAndWhere();
    });

    it('27. setJoins', async (): Promise<void> => {
        const qb: SelectQueryBuilder<Test> = testService.getRepository().createQueryBuilder('test');

        testService2.setDeletedAtField('deletedAt');
        testService.setAndWhere('`testTest2`.`deleted_at` IS NULL');

        testService.setJoins('test', qb, {
            subitems: ['tests']
        });

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
            SELECT 'test'.'id' AS 'test_id', 'test'.'name' AS 'test_name', 'test'.'created_at' AS 'test_created_at', 
            'test'.'updated_at' AS 'test_updated_at', 'test'.'deleted_at' AS 'test_deleted_at', 
            'testTest2'.'id' AS 'testTest2_id', 'testTest2'.'deleted_at' AS 'testTest2_deleted_at', 'testTest2'.'test' AS 'testTest2_test', 
            'testTest2'.'testB' AS 'testTest2_testB', 
            'testTest2TestB'.'id' AS 'testTest2TestB_id', 'testTest2TestB'.'name' AS 'testTest2TestB_name', 'testTest2TestB'.'created_at' AS 'testTest2TestB_created_at',  
            'testTest2TestB'.'updated_at' AS 'testTest2TestB_updated_at', 'testTest2TestB'.'deleted_at' AS 'testTest2TestB_deleted_at' 
            FROM 'Test' 'test'
            LEFT JOIN 'Test2' 'testTest2' ON 'testTest2'.'test'='test'.'id' AND ( 'testTest2'.'deleted_at' IS NULL AND 'testTest2'.'deleted_at' IS NULL )
            LEFT JOIN 'Test' 'testTest2TestB' ON 'testTest2TestB'.'id'='testTest2'.'testB'
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(await qb.getCount()).to.be.eq(1);

        testService.deleteAndWhere();
        testService2.setDeletedAtField(undefined);
    });

    it('28. setJoins', async (): Promise<void> => {
        const qb: SelectQueryBuilder<Test> = testService.getRepository().createQueryBuilder('test');

        testService.setJoins('test', qb, {
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
            SELECT 'test'.'id' AS 'test_id', 'test'.'name' AS 'test_name', 'test'.'created_at' AS 'test_created_at', 
            'test'.'updated_at' AS 'test_updated_at', 'test'.'deleted_at' AS 'test_deleted_at', 
            'testTest2'.'id' AS 'testTest2_id', 'testTest2'.'deleted_at' AS 'testTest2_deleted_at', 'testTest2'.'test' AS 'testTest2_test', 
            'testTest2'.'testB' AS 'testTest2_testB', 
            'testTest2TestB'.'id' AS 'testTest2TestB_id', 'testTest2TestB'.'name' AS 'testTest2TestB_name', 'testTest2TestB'.'created_at' AS 'testTest2TestB_created_at', 
            'testTest2TestB'.'updated_at' AS 'testTest2TestB_updated_at', 'testTest2TestB'.'deleted_at' AS 'testTest2TestB_deleted_at' 
            FROM 'Test' 'test'
            LEFT JOIN 'Test2' 'testTest2' ON 'testTest2'.'test'='test'.'id' AND ( 'testTest2'.'id' = ? )
            LEFT JOIN 'Test' 'testTest2TestB' ON 'testTest2TestB'.'id'='testTest2'.'testB'
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(await qb.getCount()).to.be.eq(1);
    });

    it('29. setJoins', async (): Promise<void> => {
        const qb: SelectQueryBuilder<Test> = testService.getRepository().createQueryBuilder('test');

        testService.setJoins('test', qb, {
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
            SELECT 'test'.'id' AS 'test_id', 'test'.'name' AS 'test_name', 'test'.'created_at' AS 'test_created_at', 
            'test'.'updated_at' AS 'test_updated_at', 'test'.'deleted_at' AS 'test_deleted_at', 
            'testTest2'.'id' AS 'testTest2_id', 'testTest2'.'deleted_at' AS 'testTest2_deleted_at', 'testTest2'.'test' AS 'testTest2_test', 
            'testTest2'.'testB' AS 'testTest2_testB', 
            'testTest2TestB'.'id' AS 'testTest2TestB_id', 'testTest2TestB'.'name' AS 'testTest2TestB_name', 'testTest2TestB'.'created_at' AS 'testTest2TestB_created_at', 
            'testTest2TestB'.'updated_at' AS 'testTest2TestB_updated_at', 'testTest2TestB'.'deleted_at' AS 'testTest2TestB_deleted_at' 
            FROM 'Test' 'test'
            LEFT JOIN 'Test2' 'testTest2' ON 'testTest2'.'test'='test'.'id'
            LEFT JOIN 'Test' 'testTest2TestB' ON 'testTest2TestB'.'id'='testTest2'.'testB'
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(await qb.getCount()).to.be.eq(1);
    });

    it('30. setJoins', async (): Promise<void> => {
        const qb: SelectQueryBuilder<Test> = testService.getRepository().createQueryBuilder('test');

        testService2.setDeletedAtField('deletedAt');

        testService.setJoins('test', qb, {
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
            SELECT 'test'.'id' AS 'test_id', 'test'.'name' AS 'test_name', 'test'.'created_at' AS 'test_created_at', 
            'test'.'updated_at' AS 'test_updated_at', 'test'.'deleted_at' AS 'test_deleted_at', 
            'testTest2'.'id' AS 'testTest2_id', 'testTest2'.'deleted_at' AS 'testTest2_deleted_at', 'testTest2'.'test' AS 'testTest2_test', 
            'testTest2'.'testB' AS 'testTest2_testB', 
            'testTest2TestB'.'id' AS 'testTest2TestB_id', 'testTest2TestB'.'name' AS 'testTest2TestB_name', 'testTest2TestB'.'created_at' AS 'testTest2TestB_created_at', 
            'testTest2TestB'.'updated_at' AS 'testTest2TestB_updated_at', 'testTest2TestB'.'deleted_at' AS 'testTest2TestB_deleted_at' 
            FROM 'Test' 'test'
            LEFT JOIN 'Test2' 'testTest2' ON 'testTest2'.'test'='test'.'id' AND ( 'testTest2'.'deleted_at' IS NULL AND 'testTest2'.'id' = ? )
            LEFT JOIN 'Test' 'testTest2TestB' ON 'testTest2TestB'.'id'='testTest2'.'testB'
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(await qb.getCount()).to.be.eq(1);

        testService2.setDeletedAtField(undefined);
    });

    it('31. setJoins', async (): Promise<void> => {
        const qb: SelectQueryBuilder<Test> = testService.getRepository().createQueryBuilder('test');

        testService.setJoins('test', qb, {
            subitems: ['tests'],
            ignore: ['other']
        });

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
            SELECT 'test'.'id' AS 'test_id', 'test'.'name' AS 'test_name', 'test'.'created_at' AS 'test_created_at', 
            'test'.'updated_at' AS 'test_updated_at', 'test'.'deleted_at' AS 'test_deleted_at', 
            'testTest2'.'id' AS 'testTest2_id', 'testTest2'.'deleted_at' AS 'testTest2_deleted_at', 'testTest2'.'test' AS 'testTest2_test', 
            'testTest2'.'testB' AS 'testTest2_testB', 
            'testTest2TestB'.'id' AS 'testTest2TestB_id', 'testTest2TestB'.'name' AS 'testTest2TestB_name', 'testTest2TestB'.'created_at' AS 'testTest2TestB_created_at', 
            'testTest2TestB'.'updated_at' AS 'testTest2TestB_updated_at', 'testTest2TestB'.'deleted_at' AS 'testTest2TestB_deleted_at' 
            FROM 'Test' 'test'
            LEFT JOIN 'Test2' 'testTest2' ON 'testTest2'.'test'='test'.'id'
            LEFT JOIN 'Test' 'testTest2TestB' ON 'testTest2TestB'.'id'='testTest2'.'testB'
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(await qb.getCount()).to.be.eq(1);

        testService2.setDeletedAtField(undefined);
    });

    it('32. setJoins', async (): Promise<void> => {
        const qb: SelectQueryBuilder<Test> = testService.getRepository().createQueryBuilder('test');

        testService.setJoins('test', qb, {
            subitems: ['tests'],
            ignore: ['testTest2']
        });

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
            SELECT 'test'.'id' AS 'test_id', 'test'.'name' AS 'test_name', 'test'.'created_at' AS 'test_created_at', 
            'test'.'updated_at' AS 'test_updated_at', 'test'.'deleted_at' AS 'test_deleted_at' 
            FROM 'Test' 'test'
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(await qb.getCount()).to.be.eq(1);
    });

    it('33. setJoins', async (): Promise<void> => {
        const qb: SelectQueryBuilder<Test> = testService.getRepository().createQueryBuilder('test');

        testService.setJoins('test', qb, {
            subitems: ['tests'],
            only: 'other'
        });

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
            SELECT 'test'.'id' AS 'test_id', 'test'.'name' AS 'test_name', 'test'.'created_at' AS 'test_created_at', 
            'test'.'updated_at' AS 'test_updated_at', 'test'.'deleted_at' AS 'test_deleted_at' 
            FROM 'Test' 'test'
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(await qb.getCount()).to.be.eq(1);
    });

    it('34. setJoins', async (): Promise<void> => {
        const qb: SelectQueryBuilder<Test2> = testService2.getRepository().createQueryBuilder('test2');

        testService2.setJoins('test2', qb, {});

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
            SELECT 'test2'.'id' AS 'test2_id', 'test2'.'deleted_at' AS 'test2_deleted_at', 'test2'.'test' AS 'test2_test', 
            'test2'.'testB' AS 'test2_testB', 
            'test2Test'.'id' AS 'test2Test_id', 'test2Test'.'name' AS 'test2Test_name', 'test2Test'.'created_at' AS 'test2Test_created_at', 
            'test2Test'.'updated_at' AS 'test2Test_updated_at', 'test2Test'.'deleted_at' AS 'test2Test_deleted_at', 
            'test2TestB'.'id' AS 'test2TestB_id', 'test2TestB'.'name' AS 'test2TestB_name', 'test2TestB'.'created_at' AS 'test2TestB_created_at', 
            'test2TestB'.'updated_at' AS 'test2TestB_updated_at', 'test2TestB'.'deleted_at' AS 'test2TestB_deleted_at' 
            FROM 'Test2' 'test2'
            INNER JOIN 'Test' 'test2Test' ON 'test2Test'.'id'='test2'.'test'
            INNER JOIN 'Test' 'test2TestB' ON 'test2TestB'.'id'='test2'.'testB'
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(await qb.getCount()).to.be.eq(1);
    });

    it('35. setJoins', async (): Promise<void> => {
        const qb: SelectQueryBuilder<Test2> = testService2.getRepository().createQueryBuilder('test2');

        testService2.setParentJoinType('leftJoinAndSelect');

        testService2.setJoins('test2', qb, {});

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
            SELECT 'test2'.'id' AS 'test2_id', 'test2'.'deleted_at' AS 'test2_deleted_at', 'test2'.'test' AS 'test2_test',
            'test2'.'testB' AS 'test2_testB', 
            'test2Test'.'id' AS 'test2Test_id', 'test2Test'.'name' AS 'test2Test_name', 'test2Test'.'created_at' AS 'test2Test_created_at', 
            'test2Test'.'updated_at' AS 'test2Test_updated_at', 'test2Test'.'deleted_at' AS 'test2Test_deleted_at', 
            'test2TestB'.'id' AS 'test2TestB_id', 'test2TestB'.'name' AS 'test2TestB_name', 'test2TestB'.'created_at' AS 'test2TestB_created_at', 
            'test2TestB'.'updated_at' AS 'test2TestB_updated_at', 'test2TestB'.'deleted_at' AS 'test2TestB_deleted_at' 
            FROM 'Test2' 'test2'
            LEFT JOIN 'Test' 'test2Test' ON 'test2Test'.'id'='test2'.'test'
            LEFT JOIN 'Test' 'test2TestB' ON 'test2TestB'.'id'='test2'.'testB'
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(await qb.getCount()).to.be.eq(1);

        testService2.deleteParentJoinType();
    });

    it('36. setJoins', async (): Promise<void> => {
        const qb: SelectQueryBuilder<Test2> = testService2.getRepository().createQueryBuilder('test2');

        testService2.setJoins('test2', qb, {
            joinType: 'leftJoinAndSelect'
        });

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
            SELECT 'test2'.'id' AS 'test2_id', 'test2'.'deleted_at' AS 'test2_deleted_at', 'test2'.'test' AS 'test2_test',
            'test2'.'testB' AS 'test2_testB', 
            'test2Test'.'id' AS 'test2Test_id', 'test2Test'.'name' AS 'test2Test_name', 'test2Test'.'created_at' AS 'test2Test_created_at', 
            'test2Test'.'updated_at' AS 'test2Test_updated_at', 'test2Test'.'deleted_at' AS 'test2Test_deleted_at', 
            'test2TestB'.'id' AS 'test2TestB_id', 'test2TestB'.'name' AS 'test2TestB_name', 'test2TestB'.'created_at' AS 'test2TestB_created_at', 
            'test2TestB'.'updated_at' AS 'test2TestB_updated_at', 'test2TestB'.'deleted_at' AS 'test2TestB_deleted_at' 
            FROM 'Test2' 'test2'
            LEFT JOIN 'Test' 'test2Test' ON 'test2Test'.'id'='test2'.'test'
            LEFT JOIN 'Test' 'test2TestB' ON 'test2TestB'.'id'='test2'.'testB'
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(await qb.getCount()).to.be.eq(1);
    });

    it('37. setJoins', async (): Promise<void> => {
        const qb: SelectQueryBuilder<Test2> = testService2.getRepository().createQueryBuilder('test2');

        testService2.setJoins('test2', qb, {
            ignore: ['other']
        });

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
            SELECT 'test2'.'id' AS 'test2_id', 'test2'.'deleted_at' AS 'test2_deleted_at', 'test2'.'test' AS 'test2_test',
            'test2'.'testB' AS 'test2_testB', 
            'test2Test'.'id' AS 'test2Test_id', 'test2Test'.'name' AS 'test2Test_name', 'test2Test'.'created_at' AS 'test2Test_created_at', 
            'test2Test'.'updated_at' AS 'test2Test_updated_at', 'test2Test'.'deleted_at' AS 'test2Test_deleted_at', 
            'test2TestB'.'id' AS 'test2TestB_id', 'test2TestB'.'name' AS 'test2TestB_name', 'test2TestB'.'created_at' AS 'test2TestB_created_at', 
            'test2TestB'.'updated_at' AS 'test2TestB_updated_at', 'test2TestB'.'deleted_at' AS 'test2TestB_deleted_at' 
            FROM 'Test2' 'test2'
            INNER JOIN 'Test' 'test2Test' ON 'test2Test'.'id'='test2'.'test'
            INNER JOIN 'Test' 'test2TestB' ON 'test2TestB'.'id'='test2'.'testB'
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(await qb.getCount()).to.be.eq(1);
    });

    it('38. setJoins', async (): Promise<void> => {
        const qb: SelectQueryBuilder<Test2> = testService2.getRepository().createQueryBuilder('test2');

        testService2.setJoins('test2', qb, {
            only: 'other'
        });

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
            SELECT 'test2'.'id' AS 'test2_id', 'test2'.'deleted_at' AS 'test2_deleted_at', 'test2'.'test' AS 'test2_test', 
            'test2'.'testB' AS 'test2_testB' 
            FROM 'Test2' 'test2'
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(await qb.getCount()).to.be.eq(1);
    });

    it('39. setPagination', async (): Promise<void> => {
        const qb: SelectQueryBuilder<Test> = testService.getRepository().createQueryBuilder('test');

        testService.setPagination(qb, {});

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
            SELECT 'test'.'id' AS 'test_id', 'test'.'name' AS 'test_name', 'test'.'created_at' AS 'test_created_at', 
            'test'.'updated_at' AS 'test_updated_at', 'test'.'deleted_at' AS 'test_deleted_at' FROM 'Test' 'test'
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect((await qb.getMany()).length).to.be.eq(1);
    });

    it('40. setPagination', async (): Promise<void> => {
        const qb: SelectQueryBuilder<Test> = testService.getRepository().createQueryBuilder('test');

        const paginate: Paginate = new Paginate(app, {
            _limit: 10,
            _skip: 2
        });

        testService.setPagination(qb, {
            paginate
        });

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
        SELECT 'test'.'id' AS 'test_id', 'test'.'name' AS 'test_name', 'test'.'created_at' AS 'test_created_at', 
        'test'.'updated_at' AS 'test_updated_at', 'test'.'deleted_at' AS 'test_deleted_at' FROM 'Test' 'test' LIMIT 10 OFFSET 2
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect((await qb.getMany()).length).to.be.eq(0);
    });

    it('41. list', async (): Promise<void> => {
        let sql: string;
        testService.debug.log = (data: string): void => {
            sql = data;
        };

        const items: Test[] = await testService.list('test', (qb: SelectQueryBuilder<Test>): void => {
            qb.andWhere(`test.id = :id`, {
                id: 1
            })
        }, {});

        expect(sql.replace(/\s+/ig, ' ')).to.contain(`
            SELECT 'test'.'id' AS 'test_id', 'test'.'name' AS 'test_name', 'test'.'created_at' AS 'test_created_at', 
            'test'.'updated_at' AS 'test_updated_at', 'test'.'deleted_at' AS 'test_deleted_at' 
            FROM 'Test' 'test'
            WHERE 'test'.'id' = ? AND 'test'.'deleted_at' IS NULL
            ORDER BY 'test'.'name' ASC
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(items.length).to.be.eq(1);
    });

    it('42. count', async (): Promise<void> => {
        let sql: string;
        testService.debug.log = (data: string): void => {
            sql = data;
        };

        const total: number = await testService.count('test', (qb: SelectQueryBuilder<Test>): void => {
            qb.andWhere(`test.id = :id`, {
                id: 1
            })
        }, {});

        expect(sql.replace(/\s+/ig, ' ')).to.contain(`
            SELECT 'test'.'id' AS 'test_id', 'test'.'name' AS 'test_name', 'test'.'created_at' AS 'test_created_at', 
            'test'.'updated_at' AS 'test_updated_at', 'test'.'deleted_at' AS 'test_deleted_at' 
            FROM 'Test' 'test'
            WHERE 'test'.'id' = ? AND 'test'.'deleted_at' IS NULL
            ORDER BY 'test'.'name' ASC
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(total).to.be.eq(1);
    });

    it('43. listAndCount', async (): Promise<void> => {
        let sql: string;
        testService.debug.log = (data: string): void => {
            sql = data;
        };

        const [items, total]: [Test[], number] = await testService.listAndCount('test', (qb: SelectQueryBuilder<Test>): void => {
            qb.andWhere(`test.id = :id`, {
                id: 1
            })
        }, {});

        expect(sql.replace(/\s+/ig, ' ')).to.contain(`
            SELECT 'test'.'id' AS 'test_id', 'test'.'name' AS 'test_name', 'test'.'created_at' AS 'test_created_at', 
            'test'.'updated_at' AS 'test_updated_at', 'test'.'deleted_at' AS 'test_deleted_at' 
            FROM 'Test' 'test'
            WHERE 'test'.'id' = ? AND 'test'.'deleted_at' IS NULL
            ORDER BY 'test'.'name' ASC
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(items.length).to.be.eq(1);
        expect(total).to.be.eq(1);
    });

    it('44. listBy', async (): Promise<void> => {
        let sql: string;
        testService.debug.log = (data: string): void => {
            sql = data;
        };

        const items: Test[] = await testService.listBy('test', 'id', 1, {});

        expect(sql.replace(/\s+/ig, ' ')).to.contain(`
            SELECT 'test'.'id' AS 'test_id', 'test'.'name' AS 'test_name', 'test'.'created_at' AS 'test_created_at', 
            'test'.'updated_at' AS 'test_updated_at', 'test'.'deleted_at' AS 'test_deleted_at' 
            FROM 'Test' 'test'
            WHERE 'test'.'id' = ? AND 'test'.'deleted_at' IS NULL
            ORDER BY 'test'.'name' ASC
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(items.length).to.be.eq(1);
    });

    it('45. findById', async (): Promise<void> => {
        let sql: string;
        testService.debug.log = (data: string): void => {
            sql = data;
        };

        const item: Test = await testService.findById('test', 1, {});

        expect(sql.replace(/\s+/ig, ' ')).to.contain(`
            SELECT 'test'.'id' AS 'test_id', 'test'.'name' AS 'test_name', 'test'.'created_at' AS 'test_created_at', 
            'test'.'updated_at' AS 'test_updated_at', 'test'.'deleted_at' AS 'test_deleted_at' 
            FROM 'Test' 'test'
            WHERE 'test'.'id' = ? AND 'test'.'deleted_at' IS NULL
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(item).to.exist;
    });

    it('46. findBy', async (): Promise<void> => {
        let sql: string;
        testService.debug.log = (data: string): void => {
            sql = data;
        };

        const item: Test = await testService.findBy('test', 'id', 1, {});

        expect(sql.replace(/\s+/ig, ' ')).to.contain(`
            SELECT 'test'.'id' AS 'test_id', 'test'.'name' AS 'test_name', 'test'.'created_at' AS 'test_created_at', 
            'test'.'updated_at' AS 'test_updated_at', 'test'.'deleted_at' AS 'test_deleted_at' 
            FROM 'Test' 'test'
            WHERE 'test'.'id' = ? AND 'test'.'deleted_at' IS NULL
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(item).to.exist;
    });

    it('47. find', async (): Promise<void> => {
        let sql: string;
        testService.debug.log = (data: string): void => {
            sql = data;
        };

        const item: Test = await testService.find('test', (qb: SelectQueryBuilder<Test>): void => {
            qb.andWhere(`test.id = :id`, {
                id: 1
            })
        }, {});

        expect(sql.replace(/\s+/ig, ' ')).to.contain(`
            SELECT 'test'.'id' AS 'test_id', 'test'.'name' AS 'test_name', 'test'.'created_at' AS 'test_created_at', 
            'test'.'updated_at' AS 'test_updated_at', 'test'.'deleted_at' AS 'test_deleted_at' 
            FROM 'Test' 'test'
            WHERE 'test'.'id' = ? AND 'test'.'deleted_at' IS NULL
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(item).to.exist;
    });

    it('48. save', async (): Promise<void> => {
        let item: Test = new Test();
        item.name = 'test';

        item = await testService.save(item);

        expect(item).to.exist;
        expect(item.name).to.be.eq('test');
        expect(item.createdAt).to.exist;
        expect(item.updatedAt).to.not.exist;
        expect(await testService.findById('test', item.id, {})).to.exist;
    });

    it('49. save', async (): Promise<void> => {
        expect(await testService.save(undefined)).to.be.undefined;
    });

    it('50. save', async (): Promise<void> => {
        let item: Test = new Test();
        item.name = 'test';

        item = await testService.save(item);

        item = await testService.save(item);

        expect(item).to.exist;
        expect(item.name).to.be.eq('test');
        expect(item.createdAt).to.exist;
        expect(item.updatedAt).to.exist;
    });

    it('51. save', async (): Promise<void> => {
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
        catch (error) {
            err = error;
        }

        expect(id).to.exist;
        expect(err).to.exist.and.have.property('message').eq('Test');
        expect(await testService.findById('test', id, {})).to.not.exist;
    });

    it('52. remove', async (): Promise<void> => {
        let item: Test = new Test();
        item.name = 'test';

        item = await testService.save(item);

        expect(item).to.exist;

        await testService.remove(item);

        expect(await testService.findById('test', item.id, {})).to.not.exist;
    });

    it('53. remove', async (): Promise<void> => {
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
        catch (error) {
            err = error;
        }

        expect(id).to.exist;
        expect(err).to.exist.and.have.property('message').eq('Test');
        expect(await testService.findById('test', id, {})).to.exist;
    });
});
