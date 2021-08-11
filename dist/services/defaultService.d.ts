import { Service as ParamService } from '@dfgpublicidade/node-params-module';
import { EntityManager, ObjectType, Repository, SelectQueryBuilder } from 'typeorm';
import ChildEntity from '../interfaces/childEntity';
import ParentEntity from '../interfaces/parentEntity';
import ServiceOptions from '../interfaces/serviceOptions';
import ServiceUtil from '../util/serviceUtil';
declare type Subitem = string;
declare abstract class DefaultService<T> extends ServiceUtil implements ParamService {
    idField: string;
    createdAtField: string;
    updatedAtField: string;
    deletedAtField: string;
    debug: any;
    protected defaultSorting: any;
    protected parentEntities: ParentEntity[];
    protected childEntities: ChildEntity[];
    protected connectionName: string;
    private repositoryType;
    protected constructor(repositoryType: ObjectType<T>, connectionName: string);
    getRepository(): Repository<T>;
    translateParams(param: string, alias?: string): string;
    setJoins(alias: string, qb: SelectQueryBuilder<T>, serviceOptions: ServiceOptions<Subitem>): void;
    setDefaultQuery(alias: string, qb: any, serviceOptions: ServiceOptions<Subitem>, options?: any): void;
    getSorting(alias: string, serviceOptions: ServiceOptions<Subitem>): any;
    setPagination(qb: any, serviceOptions: ServiceOptions<Subitem>): void;
    list(alias: string, queryParser: (qb: SelectQueryBuilder<T>) => void, serviceOptions: ServiceOptions<Subitem>, options?: any): Promise<T[]>;
    count(alias: string, queryParser: (qb: SelectQueryBuilder<T>) => void, serviceOptions: ServiceOptions<Subitem>, options?: any): Promise<number>;
    listAndCount(alias: string, queryParser: (qb: SelectQueryBuilder<T>) => void, serviceOptions: ServiceOptions<Subitem>, options?: any): Promise<[T[], number]>;
    listBy(alias: string, fieldName: string, fieldValue: any, serviceOptions: ServiceOptions<Subitem>, options?: any): Promise<T[]>;
    findById(alias: string, id: number, serviceOptions: ServiceOptions<Subitem>, options?: any): Promise<T>;
    findBy(alias: string, fieldName: string, fieldValue: any, serviceOptions: ServiceOptions<Subitem>, options?: any): Promise<T>;
    find(alias: string, queryParser: (qb: SelectQueryBuilder<T>) => void, serviceOptions: ServiceOptions<Subitem>, options?: any): Promise<T>;
    save(entity: T, transactionEntityManager?: EntityManager): Promise<T>;
    remove(entity: T, transactionEntityManager?: EntityManager): Promise<T>;
    private prepareQuery;
    private prepareListQuery;
}
export default DefaultService;
