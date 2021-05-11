import {Binding, Context, inject, MetadataInspector} from '@loopback/context';
import {Application, CoreBindings, Server} from '@loopback/core';
import {repository} from '@loopback/repository';
import {Channel, ConfirmChannel, Options} from 'amqplib';
import {RabbitmqBindings} from '../keys';
import {CategoryRepository} from '../repositories';
import {AmqpConnectionManager, AmqpConnectionManagerOptions, ChannelWrapper, connect} from 'amqp-connection-manager';
import {RABBITMQ_SUBSCRIBE_DECORATOR, RabbitmqSubscribeMetadata} from '../decorators/rabbitmq-subscribe.decorator';

/**
 * - Disparar uma mensagem a cada evento de cada model do Laravel: criar, editar, excluir, relacionamentos
 * - Vários microsserviços poderão ser notificados dos eventos que ocorreram
 * - Alguns microsserviços poderão querer ser notificados somente de alguns eventos: "somente quando tem novos uploads"
 */

/**
 * ack - reconhecida
 * nack - rejeitada
 * unack - esperando reconhecimento ou rejeição
 */

export interface RabbitmqConfig{
  uri: string;
  connOptions?: AmqpConnectionManagerOptions;
  exchanges?: {name: string, type: string, options?: Options.AssertExchange}[]
}

export class RabbitmqServer extends Context implements Server{
  private _listening: boolean;
  private _conn: AmqpConnectionManager
  private _channelManager: ChannelWrapper
  channel: Channel

  constructor(
    @inject(CoreBindings.APPLICATION_INSTANCE) public app: Application,
    @repository(CategoryRepository) private categoryRepo: CategoryRepository,
    @inject(RabbitmqBindings.CONFIG) private config: RabbitmqConfig
  ){
    super(app);
  }

  async start(): Promise<void>{
    this._conn = connect([this.config.uri], this.config.connOptions)
    this._channelManager = this.conn.createChannel();
    this.channelManager.on('connect', ()=> {
      this._listening = true;
      console.log('Successfully connected to RabbitMQ channel');
    })
    this.channelManager.on('error', (err, {name})=> {
      this._listening = false;
      console.log(`Failed to setup the RabbitMQ channel - name: ${name} | error: ${err.message}`);
    })
    await this.setupExchanges()
    await this.bindSubscribers()
  }

  private async setupExchanges(){
    return this.channelManager.addSetup(async (channel: ConfirmChannel) => {
      if(!this.config.exchanges){
        return;
      }
      await Promise.all(this.config.exchanges.map((exchange) => (
        channel.assertExchange(exchange.name, exchange.type, exchange.options)
      )))
    })
  }

  private async bindSubscribers(){
    this.getSubscribers()
      .map(async (item) => {
        await this.channelManager.addSetup(async (channel: ConfirmChannel) => {
          const {exchange, queue, routingKey, queueOptions} = item.metadata;
          const assertQueue = await channel.assertQueue(queue ?? '', queueOptions ?? undefined)

          const routingKeys = Array.isArray(routingKey) ? routingKey : [routingKey];
          await Promise.all(
            routingKeys.map((x) => channel.bindQueue(assertQueue.queue, exchange, x))
          )

          await this.consume({
            channel,
            queue: assertQueue.queue,
            method: item.method
          })
        })
      })
  }

  private getSubscribers(): {method: Function, metadata: RabbitmqSubscribeMetadata}[] {
    const bindings: Array<Readonly<Binding>> = this.find('services.*');
    return bindings.map(
      binding => {
        const metadata = MetadataInspector.getAllMethodMetadata<RabbitmqSubscribeMetadata>(
          RABBITMQ_SUBSCRIBE_DECORATOR, binding.valueConstructor?.prototype
        )
        if(!metadata){
          return []
        }
        const methods = []
        for(const methodName in metadata){
          if(!Object.prototype.hasOwnProperty.call(metadata, methodName)){
            return;
          }
          const service = this.getSync(binding.key) as any
          methods.push({
            method: service[methodName].bind(service),
            metadata: metadata[methodName]
          })
        }
        return methods;
      }
    ).reduce((collection: any, item: any) => {
      collection.push(...item);
      return collection;
    }, [])
  }

  private async consume({channel, queue, method}: {channel: ConfirmChannel, queue: string, method: Function}){
    await channel.consume(queue, async message => {
      try {
        if(!message){
          throw new Error('Received null message');
        }
        const content = message.content;
        if(content){
          let data
          try{
            data = JSON.parse(content.toString())
          }catch(e){
            data = null
          }
          console.log(data);
          await method({data, message, channel});
          channel.ack(message)
        }
      } catch (e) {
        console.error(e);
        //política de resposta
      }
    })
  }

  async stop(): Promise<void>{
    await this.conn.close()
    this._listening = false
  }

  get listening(): boolean{
    return this._listening
  }

  get conn(): AmqpConnectionManager{
    return this._conn
  }

  get channelManager(): ChannelWrapper{
    return this._channelManager;
  }
}
