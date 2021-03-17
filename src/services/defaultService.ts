import appDebugger from 'debug';
import { Connection, EntityManager, ObjectType, Repository, SelectQueryBuilder } from 'typeorm';
import TypeOrmManager from '../datasources/typeOrmManager';
import JoinType from '../enums/joinType';
import ChildEntity from '../interfaces/childEntity';
import ParentEntity from '../interfaces/parentEntity';
import ServiceOptions from '../interfaces/serviceOptions';
import ServiceUtil from '../util/serviceUtil';

/* Module */
const debug: appDebugger.IDebugger = appDebugger('sql:typeorm-default-service');

type Subitem = string;

abstract class DefaultService<T> {
    public idField: string = 'id';
    public createdAtField: string = 'createdAt';
    public updatedAtField: string = 'updatedAt';
    public deletedAtField: string = 'deletedAt';
    public debug: appDebugger.IDebugger;

    protected defaultSorting: any = {};

    protected parentEntities: ParentEntity[] = [];
    protected childEntities: ChildEntity[] = [];

    protected connectionName: string;
    private repositoryType: ObjectType<T>;

    protected constructor(repositoryType: ObjectType<T>, connectionName: string) {
        this.repositoryType = repositoryType;
        this.connectionName = connectionName;
        this.debug = debug;
    }

    public getRepository(): Repository<T> {
        const connection: Connection = TypeOrmManager.getConnection(this.connectionName);
        const repository: Repository<T> = connection && connection.isConnected
            ? connection.getRepository(this.repositoryType)
            : undefined;

        if (!connection || !connection.isConnected || !repository) {
            debug('Connection or repository not found');
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
            const compl: string = param.substring(param.indexOf('.') + 1);

            alias = alias ? alias : field;

            if (compl.indexOf('.') !== -1) {
                const subfield: string = compl.substring(0, compl.indexOf('.'));

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

    public setJoins(alias: string, qb: SelectQueryBuilder<T>, serviceOptions: ServiceOptions<Subitem>): void {
        ServiceUtil.forParents(alias, this.parentEntities, (
            alias: string,
            parent: ParentEntity,
            serviceOptions?: ServiceOptions<Subitem>
        ): void => {
            const parentService: DefaultService<any> = parent.service.getInstance(this.connectionName);

            let parentJoinType: JoinType = parent.joinType ? parent.joinType : 'innerJoinAndSelect';

            if ((parentJoinType === 'innerJoin' || parentJoinType === 'innerJoinAndSelect') && serviceOptions.joinType) {
                parentJoinType = serviceOptions.joinType;
            }

            const [andWhereParam, andWhereParamValue]: [string, any] = ServiceUtil.parseAndWhere(alias, parent.name, serviceOptions.andWhere);

            const parentQb: SelectQueryBuilder<any> = parentService.getRepository().createQueryBuilder(alias + parent.alias);

            if (!parent.dependent && (parentJoinType === 'leftJoin' || parentJoinType === 'leftJoinAndSelect')) {
                parentService.setDefaultQuery(alias + parent.alias, parentQb, serviceOptions);
            }

            if (andWhereParam) {
                parentQb.andWhere(andWhereParam);
            }

            const query: any = ServiceUtil.queryToString(parentQb, andWhereParamValue);

            qb[parentJoinType](
                `${alias}.${parent.name}`,
                alias + parent.alias,
                query?.where,
                query?.params
            );

            parent.service.getInstance(this.connectionName).setJoins(alias + parent.alias, qb, {
                joinType: parentJoinType,
                subitems: parent.subitems,
                ignore: serviceOptions.ignore,
                only: parent.only,
                andWhere: serviceOptions.andWhere
            });

            if (parent.dependent && (parentJoinType === 'innerJoin' || parentJoinType === 'innerJoinAndSelect')) {
                parentService.setDefaultQuery(alias + parent.alias, qb, serviceOptions);
            }
        }, serviceOptions);

        ServiceUtil.forChilds(alias, this.childEntities, (
            alias: string,
            child: ChildEntity,
            serviceOptions?: ServiceOptions<Subitem>
        ): void => {
            const childService: DefaultService<any> = child.service.getInstance(this.connectionName);

            let childJoinType: JoinType = child.joinType ? child.joinType : 'leftJoinAndSelect';

            if ((childJoinType === 'leftJoin' || childJoinType === 'leftJoinAndSelect') && serviceOptions.joinType) {
                childJoinType = serviceOptions.joinType;
            }

            const childQb: SelectQueryBuilder<any> = childService.getRepository().createQueryBuilder(alias + child.alias);

            if (!child.dependent && (childJoinType === 'leftJoin' || childJoinType === 'leftJoinAndSelect')) {
                childService.setDefaultQuery(alias + child.alias, childQb, serviceOptions);
            }

            if (child.andWhere) {
                childQb.andWhere(child.andWhere);
            }

            const [andWhereParam, andWhereParamValue]: [string, any] = ServiceUtil.parseAndWhere(alias, child.name, serviceOptions.andWhere);

            if (andWhereParam) {
                childQb.andWhere(andWhereParam);
            }

            const query: any = ServiceUtil.queryToString(childQb, andWhereParamValue);

            qb[childJoinType](
                `${alias}.${child.name}`,
                alias + child.alias,
                query?.where,
                query?.params
            );

            childService.setJoins(alias + child.alias, qb, {
                origin: alias,
                joinType: childJoinType,
                subitems: child.subitems,
                ignore: serviceOptions.ignore ? serviceOptions.ignore : undefined,
                only: child.only,
                andWhere: serviceOptions.andWhere
            });

            if (child.dependent && (childJoinType === 'innerJoin' || childJoinType === 'innerJoinAndSelect')) {
                childService.setDefaultQuery(alias + child.alias, qb, serviceOptions);
            }
        }, serviceOptions);
    }

    public setDefaultQuery(alias: string, qb: any, serviceOptions: ServiceOptions<Subitem>, options?: any): void {
        if (this.deletedAtField) {
            qb.andWhere(`${alias}.${this.deletedAtField} IS NULL`);
        }
    }

    public getSorting(alias: string, serviceOptions: ServiceOptions<Subitem>): any {
        let sort: any = {};

        if (!serviceOptions || !serviceOptions.sort || Object.keys(serviceOptions.sort).length === 0) {
            for (const key of Object.keys(this.defaultSorting)) {
                if (key.indexOf('$alias') !== 0) {
                    throw new Error('Sort keys must start with \'$alias.\'');
                }

                sort[key.replace('$alias', alias)] = this.defaultSorting[key];
            }

            ServiceUtil.forParents(alias, this.parentEntities, (
                alias: string,
                parent: ParentEntity,
                serviceOptions?: ServiceOptions<Subitem>
            ): void => {
                sort = {
                    ...sort,
                    ...parent.service.getInstance(this.connectionName).getSorting(alias + parent.alias, {
                        ignore: serviceOptions.ignore,
                        only: parent.only
                    })
                };
            }, serviceOptions);

            ServiceUtil.forChilds(alias, this.childEntities, (
                alias: string,
                child: ChildEntity,
                serviceOptions?: ServiceOptions<Subitem>
            ): void => {
                sort = {
                    ...sort,
                    ...child.service.getInstance(this.connectionName).getSorting(alias + child.alias, {
                        origin: alias,
                        ignore: serviceOptions.ignore,
                        only: child.only
                    })
                };
            }, serviceOptions);
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
        if (serviceOptions.paginate) {
            qb.take(serviceOptions.paginate.getLimit());
            qb.skip(serviceOptions.paginate.getSkip());
        }
    }

    public async list(alias: string, parseQuery: (qb: SelectQueryBuilder<T>) => void, serviceOptions: ServiceOptions<Subitem>, options?: any): Promise<T[]> {
        const qb: SelectQueryBuilder<T> = this.prepareListQuery(alias, parseQuery, serviceOptions, options);

        debug(qb.getSql());

        return qb.getMany();
    }

    public async count(alias: string, parseQuery: (qb: SelectQueryBuilder<T>) => void, serviceOptions: ServiceOptions<Subitem>, options?: any): Promise<number> {
        const qb: SelectQueryBuilder<T> = this.prepareListQuery(alias, parseQuery, serviceOptions, options);

        debug(qb.getSql());

        return qb.getCount();
    }

    public async listAndCount(alias: string, parseQuery: (qb: SelectQueryBuilder<T>) => void, serviceOptions: ServiceOptions<Subitem>, options?: any): Promise<[T[], number]> {
        const qb: SelectQueryBuilder<T> = this.prepareListQuery(alias, parseQuery, serviceOptions, options);

        debug(qb.getSql());

        return qb.getManyAndCount();
    }

    public async listBy(alias: string, fieldName: string, fieldValue: any, serviceOptions: ServiceOptions<Subitem>, options?: any): Promise<T[]> {
        const qb: SelectQueryBuilder<T> = this.prepareListQuery(alias, (qb: SelectQueryBuilder<T>): void => {
            const findParamValue: any = {};
            findParamValue[fieldName] = fieldValue;

            qb.where(`${alias}.${fieldName} = :${fieldName}`, findParamValue);
        }, serviceOptions, options);

        debug(qb.getSql());

        return qb.getMany();
    }

    public async findById(alias: string, id: number, serviceOptions: ServiceOptions<Subitem>, options?: any): Promise<T> {
        const qb: SelectQueryBuilder<T> = this.prepareQuery(alias, (qb: SelectQueryBuilder<T>): void => {
            qb.where(`${alias}.${this.idField} = :id`, {
                id
            });
        }, serviceOptions, options);

        debug(qb.getSql());

        return qb.getOne();
    }

    public async findBy(alias: string, fieldName: string, fieldValue: any, serviceOptions: ServiceOptions<Subitem>, options?: any): Promise<T> {
        const qb: SelectQueryBuilder<T> = this.prepareQuery(alias, (qb: SelectQueryBuilder<T>): void => {
            const findParamValue: any = {};
            findParamValue[fieldName] = fieldValue;

            qb.where(`${alias}.${fieldName} = :${fieldName}`, findParamValue);
        }, serviceOptions, options);

        debug(qb.getSql());

        return qb.getOne();
    }

    public async find(alias: string, parseQuery: (qb: SelectQueryBuilder<T>) => void, serviceOptions: ServiceOptions<Subitem>, options?: any): Promise<T> {
        const qb: SelectQueryBuilder<T> = this.prepareQuery(alias, parseQuery, serviceOptions, options);

        debug(qb.getSql());

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

    private prepareQuery(alias: string, parseQuery: (qb: SelectQueryBuilder<T>) => void, serviceOptions: ServiceOptions<Subitem>, options: any): SelectQueryBuilder<T> {
        const qb: SelectQueryBuilder<T> = this.getRepository().createQueryBuilder(alias);

        this.setJoins(alias, qb, serviceOptions);

        parseQuery(qb);

        this.setDefaultQuery(alias, qb, serviceOptions, options);

        return qb;
    }

    private prepareListQuery(alias: string, parseQuery: (qb: SelectQueryBuilder<T>) => void, serviceOptions: ServiceOptions<Subitem>, options: any): SelectQueryBuilder<T> {
        const qb: SelectQueryBuilder<T> = this.prepareQuery(alias, parseQuery, serviceOptions, options);

        qb.orderBy(this.getSorting(alias, serviceOptions));

        this.setPagination(qb, serviceOptions);

        return qb;
    }
}

export default DefaultService;
