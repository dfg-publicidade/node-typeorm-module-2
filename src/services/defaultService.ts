import { Service as ParamService } from '@dfgpublicidade/node-params-module';
import appDebugger from 'debug';
import { Connection, EntityManager, ObjectType, Repository, SelectQueryBuilder } from 'typeorm';
import TypeOrmManager from '../datasources/typeOrmManager';
import JoinType from '../enums/joinType';
import ChildEntity from '../interfaces/childEntity';
import InnerEntity from '../interfaces/innerEntity';
import ParentEntity from '../interfaces/parentEntity';
import ServiceOptions from '../interfaces/serviceOptions';
import ServiceUtil from '../util/serviceUtil';

/* Module */
const debug: appDebugger.IDebugger = appDebugger('sql:typeorm-default-service');

type Subitem = string;

abstract class DefaultService<T> extends ServiceUtil implements ParamService {
    public idField: string = 'id';
    public createdAtField: string = 'createdAt';
    public updatedAtField: string = 'updatedAt';
    public deletedAtField: string = 'deletedAt';
    public debug: any;

    protected defaultSorting: any = {};

    protected innerEntities: InnerEntity[] = [];
    protected parentEntities: ParentEntity[] = [];
    protected childEntities: ChildEntity[] = [];

    protected connectionName: string;
    protected classObj: any;
    private repositoryType: ObjectType<T>;

    protected constructor(repositoryType: ObjectType<T>, classObj: any, connectionName: string) {
        super();

        if (!repositoryType) {
            throw new Error('Repository type was not provided.');
        }
        if (!classObj) {
            throw new Error('Repository class was not provided.');
        }
        if (!connectionName) {
            throw new Error('Connection name was not provided.');
        }

        this.repositoryType = repositoryType;
        this.classObj = classObj;
        this.connectionName = connectionName;
        this.debug = debug;
    }

    public getRepository(): Repository<T> {
        const connection: Connection = TypeOrmManager.getConnection(this.connectionName);
        const repository: Repository<T> = connection && connection.isConnected
            ? connection.getRepository(this.repositoryType)
            : undefined;

        if (!connection || !connection.isConnected || !repository) {
            this.debug('Connection or repository not found');
            throw new Error('Connection or repository not found');
        }
        else {
            return repository;
        }
    }

    public translateParams(param: string, alias?: string): string {
        if (!param) {
            return '';
        }
        else if (param.indexOf('.') === -1) {
            return param;
        }
        else {
            const field: string = param.substring(0, param.indexOf('.'));
            let compl: string = param.substring(param.indexOf('.') + 1);

            if (compl === 'id') {
                compl = '_id';
            }

            alias = alias ? alias : field;

            if (compl.indexOf('.') !== -1) {
                const subfield: string = compl.substring(0, compl.indexOf('.'));

                for (const inner of this.innerEntities) {
                    if (inner.name === subfield) {
                        const innerService: DefaultService<T> = new this.classObj(this.connectionName);
                        innerService.parentEntities = inner.parentEntities || [];
                        innerService.childEntities = inner.childEntities || [];

                        const result: string = innerService.translateParams(compl, inner.alias);

                        return result ? `${alias}.${result}` : undefined;
                    }
                }

                for (const parent of this.parentEntities) {
                    if (parent.name === subfield) {
                        const result: string = parent.service.getInstance(this.connectionName).translateParams(compl, parent.alias);

                        return result ? alias + result : undefined;
                    }
                }

                for (const child of this.childEntities) {
                    if (child.name === subfield) {
                        const result: string = child.service.getInstance(this.connectionName).translateParams(compl, child.alias);

                        return result ? alias + result : undefined;
                    }
                }

                return undefined;
            }
            else {
                return `${alias}.${compl}`;
            }
        }
    }

    public setJoins(alias: string, qb: SelectQueryBuilder<T>, serviceOptions: ServiceOptions<Subitem>, options: any): void {
        if (!alias) {
            throw new Error('Alias was not provided.');
        }
        if (!qb) {
            throw new Error('Query builder was not provided.');
        }
        if (!serviceOptions) {
            throw new Error('Service options was not provided.');
        }

        for (const inner of this.innerEntities) {
            const innerService: any = new this.classObj(this.connectionName);
            innerService.innerEntities = [];
            innerService.parentEntities = inner.parentEntities || [];
            innerService.childEntities = inner.childEntities || [];

            innerService.setJoins(alias, qb, {
                ...serviceOptions,
                innerEntity: inner.name
            }, options);
        }

        DefaultService.forParents(alias, this.parentEntities, (
            alias: string,
            parent: ParentEntity,
            serviceOptions: ServiceOptions<Subitem>,
            options: any
        ): void => {
            const parentService: DefaultService<any> = parent.service.getInstance(this.connectionName);

            let parentJoinType: JoinType = parent.joinType ? parent.joinType : 'innerJoinAndSelect';

            let noSelect: boolean = false;
            if (parentJoinType.indexOf('AndSelect') === -1 || serviceOptions.joinType?.indexOf('AndSelect') === -1) {
                noSelect = true;
            }

            if ((parentJoinType === 'innerJoin' || parentJoinType === 'innerJoinAndSelect') && serviceOptions.joinType) {
                parentJoinType = serviceOptions.joinType;
            }

            if (noSelect) {
                parentJoinType = parentJoinType.replace('AndSelect', '') as any;
            }

            const [andWhereParam, andWhereParamValue]: [string, any] = DefaultService.parseAndWhere(alias, parent.name, serviceOptions.andWhere);

            const parentQb: SelectQueryBuilder<any> = parentService.getRepository().createQueryBuilder(alias + parent.alias);

            if (!parent.dependent && (parentJoinType === 'leftJoin' || parentJoinType === 'leftJoinAndSelect')) {
                parentService.setDefaultQuery(alias + parent.alias, parentQb, {
                    ...serviceOptions,
                    parent: true
                }, options);
            }

            if (andWhereParam) {
                parentQb.andWhere(andWhereParam);
            }

            const query: any = DefaultService.queryToString(alias + parent.alias, alias, parentQb, andWhereParamValue);

            qb[parentJoinType](
                `${alias}.${serviceOptions.innerEntity ? serviceOptions.innerEntity + '.' : ''}${parent.name}`,
                alias + parent.alias,
                query?.where,
                query?.params
            );

            parent.service.getInstance(this.connectionName).setJoins(alias + parent.alias, qb, {
                origin: alias,
                subitems: parent.subitems,
                ignore: serviceOptions.ignore,
                only: parent.only,
                andWhere: serviceOptions.andWhere,
                joinType: parentJoinType,
                parent: true
            }, options);

            if (parent.dependent && (parentJoinType === 'innerJoin' || parentJoinType === 'innerJoinAndSelect')) {
                parentService.setDefaultQuery(alias + parent.alias, qb, {
                    ...serviceOptions,
                    parent: true
                }, options);
            }
        }, serviceOptions, options);

        DefaultService.forChilds(alias, this.childEntities, (
            alias: string,
            child: ChildEntity,
            serviceOptions: ServiceOptions<Subitem>,
            options: any
        ): void => {
            const childService: DefaultService<any> = child.service.getInstance(this.connectionName);

            let childJoinType: JoinType = child.joinType ? child.joinType : 'leftJoinAndSelect';

            if (serviceOptions.joinType && !options.parent) {
                childJoinType = serviceOptions.joinType;
            }

            const childQb: SelectQueryBuilder<any> = childService.getRepository().createQueryBuilder(alias + child.alias);

            serviceOptions.ignore?.push(`${alias}${child.alias}*`);

            if (!child.dependent && (childJoinType === 'leftJoin' || childJoinType === 'leftJoinAndSelect')) {
                childService.setDefaultQuery(alias + child.alias, childQb, serviceOptions, options);
            }

            if (child.andWhere) {
                childQb.andWhere(child.andWhere);
            }

            if (childJoinType.indexOf('AndSelect') === -1 || serviceOptions.joinType?.indexOf('AndSelect') === -1) {
                childJoinType = childJoinType.replace('AndSelect', '') as any;
            }

            const [andWhereParam, andWhereParamValue]: [string, any] = DefaultService.parseAndWhere(alias, child.name, serviceOptions.andWhere);

            if (andWhereParam) {
                childQb.andWhere(andWhereParam);
            }

            const query: any = DefaultService.queryToString(alias + child.alias, alias, childQb, andWhereParamValue);

            qb[childJoinType](
                `${alias}.${serviceOptions.innerEntity ? serviceOptions.innerEntity + '.' : ''}${child.name}`,
                alias + child.alias,
                query?.where,
                query?.params
            );

            childService.setJoins(alias + child.alias, qb, {
                origin: alias,
                joinType: childJoinType === 'leftJoin' || childJoinType === 'leftJoinAndSelect' ? childJoinType
                    : childJoinType === 'innerJoin' ? 'leftJoin' : 'leftJoinAndSelect',
                subitems: child.subitems,
                ignore: serviceOptions.ignore ? serviceOptions.ignore : undefined,
                only: child.only,
                andWhere: serviceOptions.andWhere,
                parent: options.parent
            }, options);

            if (child.dependent && (childJoinType === 'innerJoin' || childJoinType === 'innerJoinAndSelect')) {
                childService.setDefaultQuery(alias + child.alias, qb, serviceOptions, options);
            }
        }, serviceOptions, options);
    }

    public setDefaultQuery(alias: string, qb: any, serviceOptions: ServiceOptions<Subitem>, options: any): void {
        if (!alias) {
            throw new Error('Alias was not provided.');
        }
        if (!qb) {
            throw new Error('Query builder was not provided.');
        }
        if (!serviceOptions) {
            throw new Error('Service options was not provided.');
        }

        if (this.deletedAtField && !serviceOptions.parent) {
            qb.andWhere(`${alias}.${this.deletedAtField} IS NULL`);
        }
    }

    public getSorting(alias: string, serviceOptions: ServiceOptions<Subitem>, options: any): any {
        if (!alias) {
            throw new Error('Alias was not provided.');
        }
        if (!serviceOptions) {
            throw new Error('Service options was not provided.');
        }

        let sort: any = {};

        if (!serviceOptions || !serviceOptions.sort || Object.keys(serviceOptions.sort).length === 0) {
            for (const key of Object.keys(this.defaultSorting)) {
                if (key.indexOf('$alias') !== 0) {
                    throw new Error('Sort keys must start with \'$alias.\'');
                }

                let aliasField: string;
                if (serviceOptions.origin) {
                    aliasField = key.replace('$alias', alias);
                    aliasField = aliasField.substring(0, aliasField.indexOf('.'));
                }

                if (!serviceOptions.origin || !aliasField.toLowerCase().endsWith(serviceOptions.origin.toLowerCase())) {
                    const defaultSort: any = {};
                    defaultSort[key.replace('$alias', alias)] = this.defaultSorting[key];

                    sort = {
                        ...sort,
                        ...defaultSort
                    };
                }
            }

            DefaultService.forChilds(alias, this.childEntities, (
                alias: string,
                child: ChildEntity,
                serviceOptions: ServiceOptions<Subitem>
            ): void => {
                serviceOptions.ignore?.push(`${alias}${child.alias}*`);

                sort = {
                    ...sort,
                    ...child.service.getInstance(this.connectionName).getSorting(alias + child.alias, {
                        origin: alias,
                        ignore: serviceOptions.ignore,
                        only: child.only
                    })
                };

            }, serviceOptions, options);
        }
        else {
            const parsedSort: any = {};

            for (const key of Object.keys(serviceOptions.sort)) {
                parsedSort[this.translateParams(key)] = serviceOptions.sort[key];
            }

            sort = parsedSort;
        }

        return sort;
    }

    public setPagination(qb: any, serviceOptions: ServiceOptions<Subitem>): void {
        if (!qb) {
            throw new Error('Query builder was not provided.');
        }
        if (!serviceOptions) {
            throw new Error('Service options was not provided.');
        }

        if (serviceOptions.paginate) {
            if ((!serviceOptions.subitems || serviceOptions.subitems.length === 0) && !serviceOptions.paginateInMemory) {
                qb.limit(serviceOptions.paginate.getLimit());
                qb.offset(serviceOptions.paginate.getSkip());
            }
        }
    }

    public async list(alias: string, queryParser: (qb: SelectQueryBuilder<T>) => void, serviceOptions: ServiceOptions<Subitem>, options: any,
        transactionEntityManager?: EntityManager): Promise<T[]> {
        if (!alias) {
            throw new Error('Alias was not provided.');
        }
        if (!queryParser) {
            throw new Error('Query parser was not provided.');
        }
        if (!serviceOptions) {
            throw new Error('Service options was not provided.');
        }

        const qb: SelectQueryBuilder<T> = this.prepareListQuery(alias, queryParser, serviceOptions, options, transactionEntityManager);

        this.debug(qb.getSql());

        if (serviceOptions.paginate) {
            if ((serviceOptions.subitems && serviceOptions.subitems.length > 0) || serviceOptions.paginateInMemory) {
                const result: T[] = await qb.getMany();

                return Promise.resolve(result.slice(
                    serviceOptions.paginate.getSkip(),
                    serviceOptions.paginate.getSkip() + serviceOptions.paginate.getLimit()
                ));
            }
        }

        return qb.getMany();
    }

    public async count(alias: string, queryParser: (qb: SelectQueryBuilder<T>) => void, serviceOptions: ServiceOptions<Subitem>, options: any,
        transactionEntityManager?: EntityManager): Promise<number> {
        if (!alias) {
            throw new Error('Alias was not provided.');
        }
        if (!queryParser) {
            throw new Error('Query parser was not provided.');
        }
        if (!serviceOptions) {
            throw new Error('Service options was not provided.');
        }

        const qb: SelectQueryBuilder<T> = this.prepareListQuery(alias, queryParser, serviceOptions, options, transactionEntityManager);

        this.debug(qb.getSql());

        return qb.getCount();
    }

    public async listAndCount(alias: string, queryParser: (qb: SelectQueryBuilder<T>) => void, serviceOptions: ServiceOptions<Subitem>, options: any,
        transactionEntityManager?: EntityManager): Promise<[T[], number]> {
        if (!alias) {
            throw new Error('Alias was not provided.');
        }
        if (!queryParser) {
            throw new Error('Query parser was not provided.');
        }
        if (!serviceOptions) {
            throw new Error('Service options was not provided.');
        }

        const qb: SelectQueryBuilder<T> = this.prepareListQuery(alias, queryParser, serviceOptions, options, transactionEntityManager);

        this.debug(qb.getSql());

        if (serviceOptions.paginate) {
            if ((serviceOptions.subitems && serviceOptions.subitems.length > 0) || serviceOptions.paginateInMemory) {
                const result: [T[], number] = await qb.getManyAndCount();

                return Promise.resolve([result[0].slice(
                    serviceOptions.paginate.getSkip(),
                    serviceOptions.paginate.getSkip() + serviceOptions.paginate.getLimit()
                ), result[1]]);
            }
        }

        return qb.getManyAndCount();
    }

    public async listBy(alias: string, fieldName: string, fieldValue: any, serviceOptions: ServiceOptions<Subitem>, options: any,
        transactionEntityManager?: EntityManager): Promise<T[]> {
        if (!alias) {
            throw new Error('Alias was not provided.');
        }
        if (!fieldName) {
            throw new Error('Field name was not provided.');
        }
        if (!serviceOptions) {
            throw new Error('Service options was not provided.');
        }

        const qb: SelectQueryBuilder<T> = this.prepareListQuery(alias, (qb: SelectQueryBuilder<T>): void => {
            const findParamValue: any = {};
            findParamValue[fieldName] = fieldValue;

            qb.where(`${alias}.${fieldName} = :${fieldName}`, findParamValue);
        }, serviceOptions, options, transactionEntityManager);

        this.debug(qb.getSql());

        if (serviceOptions.paginate) {
            if ((serviceOptions.subitems && serviceOptions.subitems.length > 0) || serviceOptions.paginateInMemory) {
                const result: T[] = await qb.getMany();

                return Promise.resolve(result.slice(
                    serviceOptions.paginate.getSkip(),
                    serviceOptions.paginate.getSkip() + serviceOptions.paginate.getLimit()
                ));
            }
        }

        return qb.getMany();
    }

    public async findById(alias: string, id: number, serviceOptions: ServiceOptions<Subitem>, options: any,
        transactionEntityManager?: EntityManager): Promise<T> {
        if (!alias) {
            throw new Error('Alias was not provided.');
        }
        if (!id) {
            throw new Error('ID was not provided.');
        }
        if (!serviceOptions) {
            throw new Error('Service options was not provided.');
        }

        const qb: SelectQueryBuilder<T> = this.prepareQuery(alias, (qb: SelectQueryBuilder<T>): void => {
            qb.where(`${alias}.${this.idField} = :id`, {
                id
            });
        }, serviceOptions, options, transactionEntityManager);

        qb.orderBy(this.getSorting(alias, serviceOptions, options));

        this.debug(qb.getSql());

        return qb.getOne();
    }

    public async findBy(alias: string, fieldName: string, fieldValue: any, serviceOptions: ServiceOptions<Subitem>, options: any,
        transactionEntityManager?: EntityManager): Promise<T> {
        if (!alias) {
            throw new Error('Alias was not provided.');
        }
        if (!fieldName) {
            throw new Error('Field name was not provided.');
        }
        if (!serviceOptions) {
            throw new Error('Service options was not provided.');
        }

        const qb: SelectQueryBuilder<T> = this.prepareQuery(alias, (qb: SelectQueryBuilder<T>): void => {
            const findParamValue: any = {};
            findParamValue[fieldName] = fieldValue;

            qb.where(`${alias}.${fieldName} = :${fieldName}`, findParamValue);
        }, serviceOptions, options, transactionEntityManager);

        qb.orderBy(this.getSorting(alias, serviceOptions, options));

        this.debug(qb.getSql());

        return qb.getOne();
    }

    public async find(alias: string, queryParser: (qb: SelectQueryBuilder<T>) => void, serviceOptions: ServiceOptions<Subitem>, options: any,
        transactionEntityManager?: EntityManager): Promise<T> {
        if (!alias) {
            throw new Error('Alias was not provided.');
        }
        if (!queryParser) {
            throw new Error('Query parser was not provided.');
        }
        if (!serviceOptions) {
            throw new Error('Service options was not provided.');
        }

        const qb: SelectQueryBuilder<T> = this.prepareQuery(alias, queryParser, serviceOptions, options, transactionEntityManager);

        qb.orderBy(this.getSorting(alias, serviceOptions, options));

        this.debug(qb.getSql());

        return qb.getOne();
    }

    public async save(entity: T, transactionEntityManager?: EntityManager): Promise<T> {
        if (!entity) {
            return Promise.resolve(undefined);
        }

        if (entity[this.idField]) {
            entity[this.updatedAtField] = new Date();
        }
        else {
            entity[this.createdAtField] = new Date();
        }

        if (transactionEntityManager) {
            return transactionEntityManager.save(entity);
        }
        else {
            const repository: Repository<T> = this.getRepository();
            return repository.save(entity);
        }
    }

    public async remove(entity: T, transactionEntityManager?: EntityManager): Promise<T> {
        entity[this.deletedAtField] = new Date();

        if (transactionEntityManager) {
            return transactionEntityManager.save(entity);
        }
        else {
            const repository: Repository<T> = this.getRepository();
            return repository.save(entity);
        }
    }

    private prepareQuery(alias: string, queryParser: (qb: SelectQueryBuilder<T>) => void, serviceOptions: ServiceOptions<Subitem>, options: any,
        transactionEntityManager?: EntityManager): SelectQueryBuilder<T> {
        const qb: SelectQueryBuilder<T> = transactionEntityManager
            ? transactionEntityManager.createQueryBuilder(this.repositoryType, alias)
            : this.getRepository().createQueryBuilder(alias);

        this.setJoins(alias, qb, serviceOptions, options);

        queryParser(qb);

        this.setDefaultQuery(alias, qb, serviceOptions, options);

        return qb;
    }

    private prepareListQuery(alias: string, queryParser: (qb: SelectQueryBuilder<T>) => void, serviceOptions: ServiceOptions<Subitem>, options: any,
        transactionEntityManager?: EntityManager): SelectQueryBuilder<T> {
        const qb: SelectQueryBuilder<T> = this.prepareQuery(alias, queryParser, serviceOptions, options, transactionEntityManager);

        qb.orderBy({
            ...serviceOptions?.additionalSort,
            ...this.getSorting(alias, serviceOptions, options)
        });

        this.setPagination(qb, serviceOptions);

        return qb;
    }
}

export default DefaultService;
