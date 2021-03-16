import Paginate from '@dfgpublicidade/node-pagination-module';
import JoinType from '../enums/joinType';

/* Module */
interface ServiceOptions<T> {
    andWhere?: any;
    ignore?: string[];
    joinType?: JoinType;
    paginate?: Paginate;
    only?: string;
    origin?: string;
    sort?: any;
    subitems?: T[];
}

export default ServiceOptions;
