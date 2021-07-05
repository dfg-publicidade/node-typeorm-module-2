"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const debug_1 = __importDefault(require("debug"));
const typeOrmManager_1 = __importDefault(require("../datasources/typeOrmManager"));
const serviceUtil_1 = __importDefault(require("../util/serviceUtil"));
/* Module */
const debug = debug_1.default('sql:typeorm-default-service');
class DefaultService extends serviceUtil_1.default {
    constructor(repositoryType, connectionName) {
        super();
        this.idField = 'id';
        this.createdAtField = 'createdAt';
        this.updatedAtField = 'updatedAt';
        this.deletedAtField = 'deletedAt';
        this.defaultSorting = {};
        this.parentEntities = [];
        this.childEntities = [];
        if (!repositoryType) {
            throw new Error('Repository type was not provided.');
        }
        if (!connectionName) {
            throw new Error('Connection name was not provided.');
        }
        this.repositoryType = repositoryType;
        this.connectionName = connectionName;
        this.debug = debug;
    }
    getRepository() {
        const connection = typeOrmManager_1.default.getConnection(this.connectionName);
        const repository = connection && connection.isConnected
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
    translateParams(param, alias) {
        if (!param) {
            return '';
        }
        else if (param.indexOf('.') === -1) {
            return param;
        }
        else {
            const field = param.substring(0, param.indexOf('.'));
            let compl = param.substring(param.indexOf('.') + 1);
            if (compl === 'id') {
                compl = '_id';
            }
            alias = alias ? alias : field;
            if (compl.indexOf('.') !== -1) {
                const subfield = compl.substring(0, compl.indexOf('.'));
                for (const parent of this.parentEntities) {
                    if (parent.name === subfield) {
                        const result = parent.service.getInstance(this.connectionName).translateParams(compl, parent.alias);
                        return result ? alias + result : undefined;
                    }
                }
                for (const child of this.childEntities) {
                    if (child.name === subfield) {
                        const result = child.service.getInstance(this.connectionName).translateParams(compl, child.alias);
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
    setJoins(alias, qb, serviceOptions) {
        if (!alias) {
            throw new Error('Alias was not provided.');
        }
        if (!qb) {
            throw new Error('Query builder was not provided.');
        }
        if (!serviceOptions) {
            throw new Error('Service options was not provided.');
        }
        DefaultService.forParents(alias, this.parentEntities, (alias, parent, serviceOptions) => {
            const parentService = parent.service.getInstance(this.connectionName);
            let parentJoinType = parent.joinType ? parent.joinType : 'innerJoinAndSelect';
            if ((parentJoinType === 'innerJoin' || parentJoinType === 'innerJoinAndSelect') && serviceOptions.joinType) {
                parentJoinType = serviceOptions.joinType;
            }
            const [andWhereParam, andWhereParamValue] = DefaultService.parseAndWhere(alias, parent.name, serviceOptions.andWhere);
            const parentQb = parentService.getRepository().createQueryBuilder(alias + parent.alias);
            if (!parent.dependent && (parentJoinType === 'leftJoin' || parentJoinType === 'leftJoinAndSelect')) {
                parentService.setDefaultQuery(alias + parent.alias, parentQb, serviceOptions);
            }
            if (andWhereParam) {
                parentQb.andWhere(andWhereParam);
            }
            const query = DefaultService.queryToString(alias + parent.alias, alias, parentQb, andWhereParamValue);
            qb[parentJoinType](`${alias}.${parent.name}`, alias + parent.alias, query === null || query === void 0 ? void 0 : query.where, query === null || query === void 0 ? void 0 : query.params);
            parent.service.getInstance(this.connectionName).setJoins(alias + parent.alias, qb, {
                origin: alias,
                subitems: parent.subitems,
                ignore: serviceOptions.ignore,
                only: parent.only,
                andWhere: serviceOptions.andWhere
            });
            if (parent.dependent && (parentJoinType === 'innerJoin' || parentJoinType === 'innerJoinAndSelect')) {
                parentService.setDefaultQuery(alias + parent.alias, qb, serviceOptions);
            }
        }, serviceOptions);
        DefaultService.forChilds(alias, this.childEntities, (alias, child, serviceOptions) => {
            const childService = child.service.getInstance(this.connectionName);
            let childJoinType = child.joinType ? child.joinType : 'leftJoinAndSelect';
            if ((childJoinType === 'leftJoin' || childJoinType === 'leftJoinAndSelect') && serviceOptions.joinType) {
                childJoinType = serviceOptions.joinType;
            }
            const childQb = childService.getRepository().createQueryBuilder(alias + child.alias);
            if (!child.dependent && (childJoinType === 'leftJoin' || childJoinType === 'leftJoinAndSelect')) {
                childService.setDefaultQuery(alias + child.alias, childQb, serviceOptions);
            }
            if (child.andWhere) {
                childQb.andWhere(child.andWhere);
            }
            const [andWhereParam, andWhereParamValue] = DefaultService.parseAndWhere(alias, child.name, serviceOptions.andWhere);
            if (andWhereParam) {
                childQb.andWhere(andWhereParam);
            }
            const query = DefaultService.queryToString(alias + child.alias, alias, childQb, andWhereParamValue);
            qb[childJoinType](`${alias}.${child.name}`, alias + child.alias, query === null || query === void 0 ? void 0 : query.where, query === null || query === void 0 ? void 0 : query.params);
            childService.setJoins(alias + child.alias, qb, {
                origin: alias,
                joinType: childJoinType === 'leftJoin' || childJoinType === 'leftJoinAndSelect' ? childJoinType : 'leftJoinAndSelect',
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
    setDefaultQuery(alias, qb, serviceOptions, options) {
        if (!alias) {
            throw new Error('Alias was not provided.');
        }
        if (!qb) {
            throw new Error('Query builder was not provided.');
        }
        if (!serviceOptions) {
            throw new Error('Service options was not provided.');
        }
        if (this.deletedAtField) {
            qb.andWhere(`${alias}.${this.deletedAtField} IS NULL`);
        }
    }
    getSorting(alias, serviceOptions) {
        if (!alias) {
            throw new Error('Alias was not provided.');
        }
        if (!serviceOptions) {
            throw new Error('Service options was not provided.');
        }
        let sort = {};
        if (!serviceOptions || !serviceOptions.sort || Object.keys(serviceOptions.sort).length === 0) {
            for (const key of Object.keys(this.defaultSorting)) {
                if (key.indexOf('$alias') !== 0) {
                    throw new Error('Sort keys must start with \'$alias.\'');
                }
                const defaultSort = {};
                defaultSort[key.replace('$alias', alias)] = this.defaultSorting[key];
                sort = Object.assign(Object.assign({}, sort), defaultSort);
            }
            DefaultService.forChilds(alias, this.childEntities, (alias, child, serviceOptions) => {
                sort = Object.assign(Object.assign({}, sort), child.service.getInstance(this.connectionName).getSorting(alias + child.alias, {
                    origin: alias,
                    ignore: serviceOptions.ignore,
                    only: child.only
                }));
            }, serviceOptions);
        }
        else {
            const parsedSort = {};
            for (const key of Object.keys(serviceOptions.sort)) {
                parsedSort[this.translateParams(key)] = serviceOptions.sort[key];
            }
            sort = parsedSort;
        }
        return sort;
    }
    setPagination(qb, serviceOptions) {
        if (!qb) {
            throw new Error('Query builder was not provided.');
        }
        if (!serviceOptions) {
            throw new Error('Service options was not provided.');
        }
        if (serviceOptions.paginate) {
            qb.take(serviceOptions.paginate.getLimit());
            qb.skip(serviceOptions.paginate.getSkip());
        }
    }
    async list(alias, queryParser, serviceOptions, options) {
        if (!alias) {
            throw new Error('Alias was not provided.');
        }
        if (!queryParser) {
            throw new Error('Query parser was not provided.');
        }
        if (!serviceOptions) {
            throw new Error('Service options was not provided.');
        }
        const qb = this.prepareListQuery(alias, queryParser, serviceOptions, options);
        debug(qb.getSql());
        return qb.getMany();
    }
    async count(alias, queryParser, serviceOptions, options) {
        if (!alias) {
            throw new Error('Alias was not provided.');
        }
        if (!queryParser) {
            throw new Error('Query parser was not provided.');
        }
        if (!serviceOptions) {
            throw new Error('Service options was not provided.');
        }
        const qb = this.prepareListQuery(alias, queryParser, serviceOptions, options);
        debug(qb.getSql());
        return qb.getCount();
    }
    async listAndCount(alias, queryParser, serviceOptions, options) {
        if (!alias) {
            throw new Error('Alias was not provided.');
        }
        if (!queryParser) {
            throw new Error('Query parser was not provided.');
        }
        if (!serviceOptions) {
            throw new Error('Service options was not provided.');
        }
        const qb = this.prepareListQuery(alias, queryParser, serviceOptions, options);
        debug(qb.getSql());
        return qb.getManyAndCount();
    }
    async listBy(alias, fieldName, fieldValue, serviceOptions, options) {
        if (!alias) {
            throw new Error('Alias was not provided.');
        }
        if (!fieldName) {
            throw new Error('Field name was not provided.');
        }
        if (!serviceOptions) {
            throw new Error('Service options was not provided.');
        }
        const qb = this.prepareListQuery(alias, (qb) => {
            const findParamValue = {};
            findParamValue[fieldName] = fieldValue;
            qb.where(`${alias}.${fieldName} = :${fieldName}`, findParamValue);
        }, serviceOptions, options);
        debug(qb.getSql());
        return qb.getMany();
    }
    async findById(alias, id, serviceOptions, options) {
        if (!alias) {
            throw new Error('Alias was not provided.');
        }
        if (!id) {
            throw new Error('ID was not provided.');
        }
        if (!serviceOptions) {
            throw new Error('Service options was not provided.');
        }
        const qb = this.prepareQuery(alias, (qb) => {
            qb.where(`${alias}.${this.idField} = :id`, {
                id
            });
        }, serviceOptions, options);
        debug(qb.getSql());
        return qb.getOne();
    }
    async findBy(alias, fieldName, fieldValue, serviceOptions, options) {
        if (!alias) {
            throw new Error('Alias was not provided.');
        }
        if (!fieldName) {
            throw new Error('Field name was not provided.');
        }
        if (!serviceOptions) {
            throw new Error('Service options was not provided.');
        }
        const qb = this.prepareQuery(alias, (qb) => {
            const findParamValue = {};
            findParamValue[fieldName] = fieldValue;
            qb.where(`${alias}.${fieldName} = :${fieldName}`, findParamValue);
        }, serviceOptions, options);
        debug(qb.getSql());
        return qb.getOne();
    }
    async find(alias, queryParser, serviceOptions, options) {
        if (!alias) {
            throw new Error('Alias was not provided.');
        }
        if (!queryParser) {
            throw new Error('Query parser was not provided.');
        }
        if (!serviceOptions) {
            throw new Error('Service options was not provided.');
        }
        const qb = this.prepareQuery(alias, queryParser, serviceOptions, options);
        debug(qb.getSql());
        return qb.getOne();
    }
    async save(entity, transactionEntityManager) {
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
            const repository = this.getRepository();
            return repository.save(entity);
        }
    }
    async remove(entity, transactionEntityManager) {
        entity[this.deletedAtField] = new Date();
        if (transactionEntityManager) {
            return transactionEntityManager.save(entity);
        }
        else {
            const repository = this.getRepository();
            return repository.save(entity);
        }
    }
    prepareQuery(alias, queryParser, serviceOptions, options) {
        const qb = this.getRepository().createQueryBuilder(alias);
        this.setJoins(alias, qb, serviceOptions);
        queryParser(qb);
        this.setDefaultQuery(alias, qb, serviceOptions, options);
        return qb;
    }
    prepareListQuery(alias, queryParser, serviceOptions, options) {
        const qb = this.prepareQuery(alias, queryParser, serviceOptions, options);
        qb.orderBy(this.getSorting(alias, serviceOptions));
        this.setPagination(qb, serviceOptions);
        return qb;
    }
}
exports.default = DefaultService;
