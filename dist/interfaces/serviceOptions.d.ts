import Paginate from '@dfgpublicidade/node-pagination-module';
import JoinType from '../enums/joinType';
interface ServiceOptions<T> {
    andWhere?: any;
    ignore?: string[];
    joinType?: JoinType;
    paginate?: Paginate;
    only?: string;
    origin?: string;
    sort?: any;
    additionalSort?: [string, string];
    subitems?: T[];
    parent?: boolean;
}
export default ServiceOptions;
