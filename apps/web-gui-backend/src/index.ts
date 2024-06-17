import express from 'express'
import { MiGPT, type MiGPTConfig } from 'mi-gpt'
import cluster from 'node:cluster'
import open from 'open'
import { getAsset } from 'node:sea'

if (cluster.isPrimary) {
  const app = express()
  app.use(express.json())

  app.get('/api/status', async (req, res) => {
    res.json({ running: Object.keys(cluster.workers!).length === 1 })
  })

  app.post('/api/start', async (req, res) => {
    const migptConfig = req.body as {
      env: object
      config: MiGPTConfig
    }

    console.log('master: 收到 /api/start', migptConfig)

    // 销毁正在运行的 worker
    for (const worker of Object.values(cluster.workers!)) {
      console.log('master: 销毁已经存在的 worker')
      worker!.send({ type: 'destroy' })
    }

    cluster
      .fork(migptConfig.env)
      .send({ type: 'run', config: migptConfig.config })

    res.json({ success: true })
  })

  app.post('/api/stop', async (req, res) => {
    console.log('master: 收到 /api/stop')

    for (const worker of Object.values(cluster.workers!)) {
      worker!.send({ type: 'destroy' })
    }

    res.json({ success: true })
  })

  app.get('/', (req, res) => {
    const htmlString = getAsset('index.html', 'utf-8')
    res.set('Content-Type', 'text/html')
    res.send(htmlString)
  })

  app.listen(34892, () => {
    open('http://localhost:34892')
  })
} else {
  console.log('worker: 创建了 worker')
  console.log('worker: 环境变量', process.env)

  let migpt: MiGPT | undefined
  cluster.worker!.on('message', (msg) => {
    if (msg.type === 'destroy') {
      console.log('worker: 收到销毁请求')

      // 测试阶段不要真正的运行
      // process.exit(0)
      if (migpt) {
        migpt.stop().then(() => {
          process.exit(0)
        })
      }
    } else if (msg.type === 'run') {
      console.log('worker: 收到运行请求，参数：', msg.config)
      const config = msg.config as MiGPTConfig

      // 测试阶段不要真正的运行
      const migpt = MiGPT.create(config)
      migpt.start()
    }
  })
}
