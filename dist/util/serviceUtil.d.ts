import { SelectQueryBuilder } from 'typeorm';
import ChildEntity from '../interfaces/childEntity';
import ParentEntity from '../interfaces/parentEntity';
import ServiceOptions from '../interfaces/serviceOptions';
declare abstract class ServiceUtil {
    static forParents(alias: string, parentEntities: ParentEntity[], action: (alias: string, parent: ParentEntity, serviceOptions?: ServiceOptions<any>) => void, serviceOptions: ServiceOptions<any>): void;
    static forChilds(alias: string, childEntities: ChildEntity[], action: (alias: string, child: ChildEntity, serviceOptions?: ServiceOptions<any>) => void, serviceOptions: ServiceOptions<any>): void;
    static parseAndWhere(alias: string, name: string, andWhere: any): [string, any];
    static queryToString(refAlias: string, alias: string, qb: SelectQueryBuilder<any>, andWhereParamValue: any): {
        where: string;
        params: any;
    };
    private static isNotOnly;
    private static toIgnore;
    private static isNotOrigin;
}
export default ServiceUtil;
