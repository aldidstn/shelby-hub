import { S3Client } from '@aws-sdk/client-s3'

export const S3_BUCKET = '0x02fe21e79c5dc351639b6522c870823e75f4951a59cb162482e1f3df2956c065'

export const s3 = new S3Client({
  endpoint: 'http://localhost:9000',
  region: 'shelbyland',
  credentials: {
    accessKeyId: 'aufklarung',
    secretAccessKey: 'aufklarung',
  },
  forcePathStyle: true,
})
