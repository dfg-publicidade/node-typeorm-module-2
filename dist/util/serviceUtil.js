"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* Module */
class ServiceUtil {
    static forParents(alias, parentEntities, action, serviceOptions) {
        for (const parent of parentEntities) {
            if (this.isNotOnly(serviceOptions, parent.name)) {
                break;
            }
            if (this.toIgnore(serviceOptions, alias + parent.alias)) {
                continue;
            }
            if (this.isNotOrigin(serviceOptions, parent)) {
                action(alias, parent, serviceOptions);
            }
        }
    }
    static forChilds(alias, childEntities, action, serviceOptions) {
        if (serviceOptions && serviceOptions.subitems) {
            for (const subitem of serviceOptions.subitems) {
                for (const child of childEntities) {
                    if (this.isNotOnly(serviceOptions, child.name)) {
                        break;
                    }
                    if (this.toIgnore(serviceOptions, alias + child.alias)) {
                        continue;
                    }
                    if (child.name === subitem) {
                        action(alias, child, serviceOptions);
                    }
                }
            }
        }
    }
    static parseAndWhere(alias, name, andWhere) {
        if (andWhere) {
            for (const andWhereKey of Object.keys(andWhere)) {
                if (`${alias}.${name}` === andWhereKey) {
                    return andWhere[andWhereKey];
                }
            }
        }
        return [undefined, undefined];
    }
    static queryToString(qb, andWhereParamValue) {
        let where = qb.getQuery();
        if (where.indexOf('WHERE') === -1) {
            return undefined;
        }
        else {
            let end = where.indexOf('ORDER BY');
            if (end === -1) {
                end = where.indexOf('GROUP BY');
            }
            if (end === -1) {
                end = where.indexOf('LIMIT BY');
            }
            if (end === -1) {
                end = where.length;
            }
            where = where.substring(where.indexOf('WHERE') + 'WHERE'.length, end).trim();
            return {
                where,
                params: andWhereParamValue
            };
        }
    }
    static isNotOnly(serviceOptions, name) {
        return serviceOptions && serviceOptions.only && serviceOptions.only !== name;
    }
    static toIgnore(serviceOptions, alias) {
        return serviceOptions.ignore && serviceOptions.ignore.indexOf(alias) !== -1;
    }
    static isNotOrigin(serviceOptions, parent) {
        return !serviceOptions || !serviceOptions.origin || parent.name !== serviceOptions.origin && !parent.alias.endsWith(serviceOptions.origin);
    }
}
exports.default = ServiceUtil;
