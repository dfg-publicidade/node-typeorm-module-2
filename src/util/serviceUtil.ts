import Strings from '@dfgpublicidade/node-strings-module';
import { SelectQueryBuilder } from 'typeorm';
import ChildEntity from '../interfaces/childEntity';
import ParentEntity from '../interfaces/parentEntity';
import ServiceOptions from '../interfaces/serviceOptions';

/* Module */
abstract class ServiceUtil {
    protected static forParents(
        alias: string,
        parentEntities: ParentEntity[],
        action: (
            alias: string,
            parent: ParentEntity,
            serviceOptions: ServiceOptions<any>,
            options: any
        ) => void,
        serviceOptions: ServiceOptions<any>,
        options: any
    ): void {
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

    protected static forChilds(
        alias: string,
        childEntities: ChildEntity[],
        action: (
            alias: string,
            child: ChildEntity,
            serviceOptions: ServiceOptions<any>,
            options: any
        ) => void,
        serviceOptions: ServiceOptions<any>,
        options: any
    ): void {
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

    protected static parseAndWhere(alias: string, name: string, andWhere: any): [string, any] {
        if (andWhere) {
            for (const andWhereKey of Object.keys(andWhere)) {
                if (`${alias}.${name}` === andWhereKey) {
                    return andWhere[andWhereKey];
                }
            }
        }

        return [undefined, undefined];
    }

    protected static queryToString(refAlias: string, alias: string, qb: SelectQueryBuilder<any>, andWhereParamValue: any): {
        where: string;
        params: any;
    } {
        let where: string = qb.getQuery();

        if (where.indexOf('WHERE') === -1) {
            return undefined;
        }
        else {
            let end: number = where.indexOf('ORDER BY');

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
            where = where.replace(new RegExp(`${refAlias}${Strings.firstCharToUpper(alias)}`, 'g'), alias);

            return {
                where,
                params: {
                    ...qb.getParameters(),
                    ...andWhereParamValue
                }
            };
        }
    }

    private static isNotOnly(serviceOptions: ServiceOptions<any>, name: string): boolean {
        return serviceOptions && serviceOptions.only && serviceOptions.only !== name;
    }

    private static toIgnore(serviceOptions: ServiceOptions<any>, alias: string): boolean {
        return serviceOptions.ignore && serviceOptions.ignore.indexOf(alias) !== -1;
    }

    private static isNotOrigin(serviceOptions: ServiceOptions<any>, parent: ParentEntity): boolean {
        return !serviceOptions || !serviceOptions.origin || parent.name !== serviceOptions.origin && !serviceOptions.origin.endsWith(parent.alias);
    }
}

export default ServiceUtil;
