"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_strings_module_1 = __importDefault(require("@dfgpublicidade/node-strings-module"));
/* Module */
class ServiceUtil {
    static notIgnored(serviceOptions, join) {
        return !serviceOptions.ignore || !serviceOptions.ignore.some((ignore) => ignore.indexOf('*') === -1
            ? ignore.toLowerCase() === join.toLowerCase()
            : join.toLowerCase().startsWith(ignore.toLowerCase().replace('*', '')));
    }
    static forParents(alias, parentEntities, action, serviceOptions, options) {
        for (const parent of parentEntities) {
            if (this.isNotOnly(serviceOptions, parent.name)) {
                break;
            }
            if (this.toIgnore(serviceOptions, alias + parent.alias)) {
                continue;
            }
            if (this.isNotOrigin(serviceOptions, parent)) {
                action(alias, parent, serviceOptions, options);
            }
        }
    }
    static forChilds(alias, childEntities, action, serviceOptions, options) {
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
                        action(alias, child, serviceOptions, options);
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
    static queryToString(refAlias, alias, qb, andWhereParamValue) {
        let where = qb.getQuery();
        if (where.indexOf('WHERE') === -1) {
            return undefined;
        }
        else {
            where = where.substring(where.indexOf('WHERE') + 'WHERE'.length).trim();
            where = where.replace(new RegExp(`${refAlias}${node_strings_module_1.default.firstCharToUpper(alias)}`, 'g'), alias);
            return {
                where,
                params: Object.assign(Object.assign({}, qb.getParameters()), andWhereParamValue)
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
        return !serviceOptions || !serviceOptions.origin || parent.name !== serviceOptions.origin && !serviceOptions.origin.endsWith(parent.alias);
    }
}
exports.default = ServiceUtil;
