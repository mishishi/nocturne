import { useTranslation } from 'react-i18next'
import { Breadcrumb } from '../components/Breadcrumb'
import styles from './Legal.module.css'

/**
 * Terms of Service page
 */
export function TermsOfService() {
  const { t, i18n } = useTranslation()
  const isEnglish = i18n.language === 'en'

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Breadcrumb
          items={[
            { label: isEnglish ? 'Home' : '首页', href: '/' },
            { label: isEnglish ? 'Terms of Service' : '用户协议' }
          ]}
        />

        <article className={styles.article}>
          <h1 className={styles.title}>{isEnglish ? 'Terms of Service' : '用户服务协议'}</h1>
          <p className={styles.lastUpdate}>{isEnglish ? 'Last updated: May 8, 2026' : '最后更新日期：2026年5月8日'}</p>

          {isEnglish ? (
            <>
              <section className={styles.section}>
                <h2>1. Service Description</h2>
                <p>Nocturne (hereinafter "we", "us", or "our") is an AI dream-sharing application that helps users record dreams, generate AI stories, post to the Dream Wall, and share with friends.</p>
                <p>By using our services, you agree to comply with all terms of this agreement.</p>
              </section>

              <section className={styles.section}>
                <h2>2. Account Registration</h2>
                <ul>
                  <li>You need to provide a valid email address to register</li>
                  <li>You should keep your account information safe; any loss due to failing to keep your account information safe is your own responsibility</li>
                  <li>Children under 14 years old should not use this service</li>
                  <li>Minors between 14 and 18 years old should use this service with the company of a guardian</li>
                  <li>One email address can only register one account</li>
                </ul>
              </section>

              <section className={styles.section}>
                <h2>3. Content Guidelines</h2>
                <p>All content you post on Nocturne (including but not limited to dream descriptions, stories, comments) should comply with:</p>
                <ul>
                  <li>Applicable laws and regulations of the People's Republic of China</li>
                  <li>Social ethics and moral standards</li>
                  <li>No pornographic, violent, or bloody content</li>
                  <li>No infringement on others' legitimate rights (portrait rights, privacy rights, intellectual property, etc.)</li>
                </ul>
                <p>For violations of the above guidelines, we have the right to delete content and terminate services.</p>
              </section>

              <section className={styles.section}>
                <h2>4. AI-Generated Content</h2>
                <ul>
                  <li>The copyright of AI-generated stories belongs to you, and you are free to use them</li>
                  <li>You understand that AI-generated content may contain inaccuracies or fictional elements</li>
                  <li>Please do not use AI-generated content for commercial promotion or illegal purposes</li>
                </ul>
              </section>

              <section className={styles.section}>
                <h2>5. Points and Medals</h2>
                <ul>
                  <li>Dream points are rewards for participating in community activities and cannot be exchanged for cash</li>
                  <li>We reserve the right to adjust point earning rules</li>
                  <li>Medals are symbols of honor and cannot be revoked once unlocked</li>
                </ul>
              </section>

              <section className={styles.section}>
                <h2>6. Intellectual Property</h2>
                <ul>
                  <li>Nocturne's product design, interface, trademarks, etc. belong to us</li>
                  <li>The copyright of content you post belongs to you</li>
                  <li>You grant us the right to use your posted content within the scope of our services</li>
                </ul>
              </section>

              <section className={styles.section}>
                <h2>7. Service Changes and Termination</h2>
                <ul>
                  <li>We reserve the right to modify or interrupt services at any time</li>
                  <li>We have the right to immediately terminate services upon discovery of violations</li>
                  <li>After service termination, your account data will be handled according to the privacy policy</li>
                </ul>
              </section>

              <section className={styles.section}>
                <h2>8. Refund Policy</h2>
                <p>Our services are divided into free features and paid membership features:</p>
                <ul>
                  <li><strong>Free Features</strong>: Basic dream recording, AI story generation and other core features are permanently free</li>
                  <li><strong>Paid Membership</strong>: Advanced features are available by monthly/yearly subscription</li>
                  <li>Membership subscriptions can be cancelled at any time; services continue until the end of the current subscription period</li>
                  <li>If services are unavailable due to technical issues, we will handle refunds based on actual circumstances</li>
                  <li>Virtual items and point purchases are not eligible for refunds</li>
                  <li>For refunds, please contact customer support at support@yeelin.app</li>
                </ul>
              </section>

              <section className={styles.section}>
                <h2>9. Disclaimer</h2>
                <p>You understand and agree:</p>
                <ul>
                  <li>Services are provided "as is" without any express or implied warranties</li>
                  <li>We are not responsible for losses caused by force majeure</li>
                  <li>Disputes between users should be resolved by the users themselves; we have the right to intervene in mediation</li>
                </ul>
              </section>

              <section className={styles.section}>
                <h2>10. Contact Us</h2>
                <p>If you have any questions about this agreement, please contact us:</p>
                <ul>
                  <li>Use the "Feedback" feature in the app</li>
                  <li>Send email to: support@yeelin.app</li>
                </ul>
              </section>
            </>
          ) : (
            <>
              <section className={styles.section}>
                <h2>一、服务说明</h2>
                <p>夜棂（以下简称"我们"）是一个 AI 梦境分享应用，帮助用户记录梦境、AI 生成故事、发布到梦墙、与好友分享。</p>
                <p>使用我们的服务即表示您同意遵守本协议的各项条款。</p>
              </section>

              <section className={styles.section}>
                <h2>二、账号注册</h2>
                <ul>
                  <li>您需要提供真实的电子邮箱地址进行注册</li>
                  <li>您应妥善保管账号信息，因个人保管不善造成的损失由您自行承担</li>
                  <li>14 周岁以下的未成年人不应使用本服务</li>
                  <li>14 至 18 周岁的未成年人应在监护人的陪同下使用本服务</li>
                  <li>一个邮箱地址只能注册一个账号</li>
                </ul>
              </section>

              <section className={styles.section}>
                <h2>三、内容规范</h2>
                <p>您在夜棂发布的所有内容（包括但不限于梦境描述、故事、评论）应遵守：</p>
                <ul>
                  <li>中华人民共和国法律法规</li>
                  <li>社会公德和道德风尚</li>
                  <li>不含有色情、暴力、血腥内容</li>
                  <li>不侵犯他人合法权益（肖像权、隐私权、知识产权等）</li>
                </ul>
                <p>违反上述规范的，我们有权删除内容并终止服务。</p>
              </section>

              <section className={styles.section}>
                <h2>四、AI 生成内容</h2>
                <ul>
                  <li>AI 生成的故事版权归您所有，您可以自由使用</li>
                  <li>您理解 AI 生成内容可能存在不准确或虚构成分</li>
                  <li>请勿将 AI 生成内容用于商业推广或违法用途</li>
                </ul>
              </section>

              <section className={styles.section}>
                <h2>五、积分与勋章</h2>
                <ul>
                  <li>梦境积分是您参与社区活动的奖励，不能兑换现金</li>
                  <li>我们有权调整积分获取规则</li>
                  <li>勋章是荣誉象征，解锁后不能撤销</li>
                </ul>
              </section>

              <section className={styles.section}>
                <h2>六、知识产权</h2>
                <ul>
                  <li>夜棂的产品设计、界面、商标等归我们所有</li>
                  <li>您发布的内容版权归您所有</li>
                  <li>您授予我们在服务范围内使用您发布内容的权利</li>
                </ul>
              </section>

              <section className={styles.section}>
                <h2>七、服务变更与终止</h2>
                <ul>
                  <li>我们保留随时修改或中断服务的权利</li>
                  <li>我们有权在发现违规行为时立即终止服务</li>
                  <li>服务终止后，您的账号数据将按隐私政策处理</li>
                </ul>
              </section>

              <section className={styles.section}>
                <h2>八、退款政策</h2>
                <p>我们的服务分为免费功能和付费会员功能：</p>
                <ul>
                  <li><strong>免费功能</strong>：基础梦境记录、AI故事生成等核心功能永久免费</li>
                  <li><strong>付费会员</strong>：高级功能按月/年订阅付费</li>
                  <li>会员订阅可在任何时间取消，取消后服务持续到当前订阅周期结束</li>
                  <li>因技术问题导致服务不可用，我们将根据实际情况处理退款</li>
                  <li>虚拟物品和积分购买不支持退款</li>
                  <li>如需退款，请通过 support@yeelin.app 联系客服</li>
                </ul>
              </section>

              <section className={styles.section}>
                <h2>九、免责声明</h2>
                <p>您理解并同意：</p>
                <ul>
                  <li>服务按"现状"提供，我们不做任何明示或暗示保证</li>
                  <li>我们对因不可抗力造成的损失不承担责任</li>
                  <li>用户间纠纷由用户自行解决，我们有权介入调解</li>
                </ul>
              </section>

              <section className={styles.section}>
                <h2>十、联系我们</h2>
                <p>如对本协议有任何疑问，请通过以下方式联系我们：</p>
                <ul>
                  <li>通过应用内的"意见反馈"功能联系我们</li>
                  <li>发送邮件至：support@yeelin.app</li>
                </ul>
              </section>
            </>
          )}
        </article>
      </div>
    </div>
  )
}
