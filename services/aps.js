import express from 'express';
import fs from 'fs';
import APS from 'forge-apis';
import { APS_CLIENT_ID, APS_CLIENT_SECRET, APS_BUCKET } from '../config.js';

let internalAuthClient = new APS.AuthClientTwoLegged(
    APS_CLIENT_ID, APS_CLIENT_SECRET,
    ['bucket:read', 'bucket:create', 'data:read', 'data:write', 'data:create'],
    true
);

let externalAuthClient = new APS.AuthClientTwoLegged(
    APS_CLIENT_ID, APS_CLIENT_SECRET,
    ['viewables:read'], 
    true
);

export const getInternalToken = async () => {
    if (!internalAuthClient.isAuthorized()) {
        await internalAuthClient.authenticate();
    }

    console.log('--- here at getInternalToken method...');
    console.log(internalAuthClient.getCredentials());
    return internalAuthClient.getCredentials();
}

export const getExternalToken = async () => {
    if (!externalAuthClient.isAuthorized()) {
        await externalAuthClient.authenticate();
    }
    return externalAuthClient.getCredentials();
}

const createBucket = async (bucketKey) => {
    console.log('--- here at createBucket method');
    try {
        await new APS.BucketsApi().createBucket(
            { bucketKey, policyKey: 'persistent' },
            {}, null, await getInternalToken()
        );
    } catch (error) {
        console.log('--- error creating bucket!');
        console.log(error);
    }
}

const ensureBucketExists = async (bucketKey) => {
    console.log('--- here at ensureBucketExists method...');
    console.log(bucketKey);
    try {
        await new APS.BucketsApi().getBucketDetails(bucketKey, null, await getInternalToken());
    } catch (err) {
        console.log('--- error get bucket details!');
        console.log(err);
        if (err.response.status === 404 || err.response.status === 403) {
            createBucket(bucketKey);
        } else {
            console.log('--- error ensureBucketExists method!');
            console.log(err);
            throw err;
        }
    }
};

export const listObjects = async () => {
    await ensureBucketExists(APS_BUCKET);
    let resp = await new APS.ObjectsApi().getObjects(
                                            APS_BUCKET, { limit: 64 }, null, 
                                            await getInternalToken()
                                        );
    let objects = resp.body.items;
    while (resp.body.next) {
        const startAt = new URL(resp.body.next).searchParams.get('startAt');
        resp = await new APS.ObjectsApi().getObjects(
                                            APS_BUCKET, { limit: 64, startAt }, null, 
                                            await getInternalToken()
                                        );
        objects = objects.concat(resp.body.items);
    }
    return objects;
};

export const uploadObject = async (objectName, filePath) => {
    await ensureBucketExists(APS_BUCKET);
    const buffer = await fs.promises.readFile(filePath);
    const results = await new APS.ObjectsApi().uploadResources(
        APS_BUCKET,
        [{ objectKey: objectName, data: buffer }],
        { useAcceleration: false, minutesExpiration: 15 },
        null,
        await getInternalToken()
    );
    if (results[0].error) {
        throw results[0].completed;
    } else {
        return results[0].completed;
    }
};

export const translateObject = async (urn, rootFilename) => {
    const job = {
        input: { urn },
        output: { formats: [{ type: 'svf', views: ['2d', '3d'] }] }
    };
    if (rootFilename) {
        job.input.compressedUrn = true;
        job.input.rootFilename = rootFilename;
    }
    const resp = await new APS.DerivativesApi().translate(job, {}, null, await getInternalToken());
    return resp.body;
};

export const getManifest = async (urn) => {
    try {
        const resp = await new APS.DerivativesApi().getManifest(urn, {}, null, await getInternalToken());
        return resp.body;
    } catch (err) {
        if (err.response.status === 404) {
            return null;
        } else {
            throw err;
        }
    }
};

export const urnify = (id) => Buffer.from(id).toString('base64').replace(/=/g, '');