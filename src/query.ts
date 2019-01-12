type Condition<T, P extends keyof T> = {
    $eq?: T[P];
    $gt?: T[P];
    $gte?: T[P];
    $in?: T[P][];
    $lt?: T[P];
    $lte?: T[P];
    $ne?: T[P];
    $nin?: T[P][];
    $and?: (FilterQuery<T[P]> | T[P])[];
    $or?: (FilterQuery<T[P]> | T[P])[];
    $not?: (FilterQuery<T[P]> | T[P])[] | T[P];
    $expr?: any;
    $jsonSchema?: any;
    $mod?: [number, number];
    $regex?: RegExp;
    $options?: string;
    $text?: {
        $search: string;
        $language?: string;
        $caseSensitive?: boolean;
        $diacraticSensitive?: boolean;
    };
    $where: Object;
    $geoIntersects?: Object;
    $geoWithin?: Object;
    $near?: Object;
    $nearSphere?: Object;
    $elemMatch?: Object;
    $size?: number;
    $bitsAllClear?: Object;
    $bitsAllSet?: Object;
    $bitsAnyClear?: Object;
    $bitsAnySet?: Object;
    [key: string]: any;
};
export type FilterQuery<T> = {
    [P in keyof T]?: T[P] | Condition<T, P>;
} | { [key: string]: any };

export type Projection<T> = {
	[P in keyof T]?:number
}
