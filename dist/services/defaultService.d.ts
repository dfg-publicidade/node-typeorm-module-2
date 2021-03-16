import appDebugger from 'debug';
import { EntityManager, ObjectType, Repository, SelectQueryBuilder } from 'typeorm';
import ChildEntity from '../interfaces/childEntity';
import ParentEntity from '../interfaces/parentEntity';
import ServiceOptions from '../interfaces/serviceOptions';
declare type Subitem = string;
declare abstract class DefaultService<T> {
    idField: string;
    createdAtField: string;
    updatedAtField: string;
    deletedAtField: string;
    debug: appDebugger.IDebugger;
    protected defaultSorting: any;
    protected parentEntities: ParentEntity[];
    protected childEntities: ChildEntity[];
    protected connectionName: string;
    private repositoryType;
    protected constructor(repositoryType: ObjectType<T>, connectionName: string);
    getRepository(): Repository<T>;
    translateParams(param: string, alias?: string): string;
    setJoins(alias: string, qb: any, serviceOptions: ServiceOptions<Subitem>): void;
    setDefaultQuery(alias: string, qb: any, serviceOptions: ServiceOptions<Subitem>, options?: any): void;
    getSorting(alias: string, serviceOptions: ServiceOptions<Subitem>): any;
    setPagination(qb: any, serviceOptions: ServiceOptions<Subitem>): void;
    list(alias: string, parseQuery: (qb: SelectQueryBuilder<T>) => void, serviceOptions: ServiceOptions<Subitem>, options?: any): Promise<T[]>;
    count(alias: string, parseQuery: (qb: SelectQueryBuilder<T>) => void, serviceOptions: ServiceOptions<Subitem>, options?: any): Promise<number>;
    listAndCount(alias: string, parseQuery: (qb: SelectQueryBuilder<T>) => void, serviceOptions: ServiceOptions<Subitem>, options?: any): Promise<[T[], number]>;
    listBy(alias: string, fieldName: string, fieldValue: any, serviceOptions: ServiceOptions<Subitem>, options?: any): Promise<T[]>;
    findById(alias: string, id: number, serviceOptions: ServiceOptions<Subitem>, options?: any): Promise<T>;
    findBy(alias: string, fieldName: string, fieldValue: any, serviceOptions: ServiceOptions<Subitem>, options?: any): Promise<T>;
    find(alias: string, parseQuery: (qb: SelectQueryBuilder<T>) => void, serviceOptions: ServiceOptions<Subitem>, options?: any): Promise<T>;
    save(entity: T, transactionEntityManager?: EntityManager): Promise<T>;
    remove(entity: T, transactionEntityManager?: EntityManager): Promise<T>;
    private prepareQuery;
    private prepareListQuery;
}
export default DefaultService;
