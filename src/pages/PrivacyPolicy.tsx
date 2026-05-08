import { useTranslation } from 'react-i18next'
import { Breadcrumb } from '../components/Breadcrumb'
import styles from './Legal.module.css'

/**
 * 隐私政策页面
 * 依据 GDPR 和中国《个人信息保护法》要求编写
 */
export function PrivacyPolicy() {
  const { t, i18n } = useTranslation()
  const isEnglish = i18n.language === 'en'

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Breadcrumb
          items={[
            { label: isEnglish ? 'Home' : '首页', href: '/' },
            { label: isEnglish ? 'Privacy Policy' : '隐私政策' }
          ]}
        />

        <article className={styles.article}>
          <h1 className={styles.title}>{isEnglish ? 'Privacy Policy' : '隐私政策'}</h1>
          <p className={styles.lastUpdate}>{isEnglish ? 'Last updated: May 8, 2026' : '最后更新日期：2026年5月8日'}</p>

          {isEnglish ? (
            <>
              <section className={styles.section}>
                <h2>1. Information Collection</h2>
                <p>Nocturne (hereinafter "we", "us", or "our") takes your personal information and privacy protection very seriously. This policy explains how we collect, use, store, and protect your personal information.</p>
                <h3>1.1 Information You Provide</h3>
                <ul>
                  <li><strong>Account Information</strong>: Nickname, avatar, email address (used for login and account recovery)</li>
                  <li><strong>Dream Content</strong>: Dream descriptions and Q&A responses you provide</li>
                  <li><strong>Generated Content</strong>: AI-generated stories and interpretations</li>
                  <li><strong>Community Interactions</strong>: Posts, comments, and likes on the Dream Wall</li>
                  <li><strong>Friend Relationships</strong>: Your friendships with other users</li>
                </ul>
                <h3>1.2 Information Collected Automatically</h3>
                <ul>
                  <li><strong>Device Information</strong>: Device type, operating system, screen resolution</li>
                  <li><strong>Log Information</strong>: Access time, page paths, feature usage</li>
                  <li><strong>Push Subscriptions</strong>: Web Push notification subscription information</li>
                </ul>
              </section>

              <section className={styles.section}>
                <h2>2. Information Use</h2>
                <p>We use collected information for:</p>
                <ul>
                  <li>Providing, maintaining, and improving our services</li>
                  <li>Generating personalized dream stories and interpretations</li>
                  <li>Processing account login and security verification</li>
                  <li>Sending service notifications (e.g., check-in reminders, interaction notifications)</li>
                  <li>Analyzing service usage to improve user experience</li>
                  <li>Meeting legally required retention periods</li>
                </ul>
              </section>

              <section className={styles.section}>
                <h2>3. Information Sharing</h2>
                <p>We will not share your personal information with any third parties except:</p>
                <ul>
                  <li><strong>With Your Consent</strong>: Only when you explicitly agree</li>
                  <li><strong>Anonymization</strong>: Information that has been anonymized and cannot identify you</li>
                  <li><strong>Legal Requirements</strong>: When required by government authorities under applicable laws</li>
                </ul>
                <p className={styles.note}>We use third-party services:</p>
                <ul>
                  <li><strong>AI Generation Services</strong>: For generating dream stories (only necessary story content is transmitted)</li>
                  <li><strong>Data Analytics</strong>: Optional Umami self-hosted analytics service (no cookies used)</li>
                  <li><strong>Customer Support</strong>: Optional Crisp.chat online customer service (if configured)</li>
                </ul>
              </section>

              <section className={styles.section}>
                <h2>4. Information Storage</h2>
                <ul>
                  <li>Your personal information is stored on servers located in the People's Republic of China</li>
                  <li>We retain your information only for the minimum period necessary for the purposes described in this policy</li>
                  <li>After the retention period, your information will be deleted or anonymized</li>
                  <li>Dream stories and similar content are stored until you actively delete them or delete your account</li>
                </ul>
                <h3>Data Retention Periods</h3>
                <ul>
                  <li><strong>Account Basic Information</strong>: Deleted within 30 days after you actively delete your account</li>
                  <li><strong>Dream Records and Generated Stories</strong>: Stored until you actively delete or delete your account</li>
                  <li><strong>Dream Wall Posts and Comments</strong>: Deleted within 30 days after you actively delete or delete your account</li>
                  <li><strong>Friend Relationships</strong>: Deleted within 30 days after you actively delete or delete your account</li>
                  <li><strong>Notification Records</strong>: Automatically deleted after 30 days</li>
                  <li><strong>Operation Logs</strong>: Automatically deleted after 90 days</li>
                  <li><strong>Points and Medals</strong>: Immediately invalidated upon account deletion, non-recoverable</li>
                </ul>
              </section>

              <section className={styles.section}>
                <h2>5. Information Security</h2>
                <p>We employ industry-standard security measures to protect your information:</p>
                <ul>
                  <li>HTTPS encryption for all communications</li>
                  <li>Strict database access controls</li>
                  <li>Regular security audits and vulnerability scans</li>
                  <li>Principle of least privilege for employee access</li>
                </ul>
              </section>

              <section className={styles.section}>
                <h2>6. Your Rights</h2>
                <p>Under applicable laws and regulations, you have the following rights:</p>
                <ul>
                  <li><strong>Access Right</strong>: To know what personal information we hold about you</li>
                  <li><strong>Correction Right</strong>: To request correction of inaccurate personal information</li>
                  <li><strong>Deletion Right</strong>: To request deletion of your personal information (contact customer service)</li>
                  <li><strong>Data Portability Right</strong>: To download all your data in "Profile - Export Data"</li>
                  <li><strong>Withdraw Consent</strong>: You can disable notification permissions, though this may affect related features</li>
                </ul>
              </section>

              <section className={styles.section}>
                <h2>7. Cookie Use</h2>
                <p>We use cookies for:</p>
                <ul>
                  <li><strong>Authentication</strong>: Maintaining login state (essential authentication cookies)</li>
                  <li><strong>Feature Preferences</strong>: Remembering your theme, language, and other settings</li>
                </ul>
                <p>You can refuse cookies through your browser settings, but this may cause some features to not work properly.</p>
                <p className={styles.note}>Optional analytics and customer support features will not be activated without your consent.</p>
              </section>

              <section className={styles.section}>
                <h2>8. Children's Privacy</h2>
                <p>We take children's privacy protection very seriously.</p>
                <ul>
                  <li>Our services are primarily intended for adults aged 18 and above</li>
                  <li>Children under 14 years old should not use our services</li>
                  <li>Minors between 14 and 18 years old should use our services only with the company of a guardian</li>
                  <li>We do not knowingly collect personal information from children</li>
                  <li>If you are a minor, please use our services under the supervision of a guardian</li>
                </ul>
              </section>

              <section className={styles.section}>
                <h2>9. Policy Updates</h2>
                <p>We may update this privacy policy from time to time. When updated, we will post a notice on the page. Please check regularly for the latest version.</p>
              </section>

              <section className={styles.section}>
                <h2>10. Contact Us</h2>
                <p>If you have any questions or suggestions about this privacy policy, please contact us:</p>
                <ul>
                  <li>Use the "Feedback" feature in the app</li>
                  <li>Send email to: support@yeelin.app</li>
                </ul>
              </section>
            </>
          ) : (
            <>
              <section className={styles.section}>
                <h2>一、信息收集</h2>
                <p>夜棂（以下简称"我们"）非常重视您的个人信息和隐私保护。本政策旨在向您说明我们如何收集、使用、存储和保护您的个人信息。</p>
                <h3>1.1 您主动提供的信息</h3>
                <ul>
                  <li><strong>账户信息</strong>：昵称、头像、邮箱地址（用于登录和账号找回）</li>
                  <li><strong>梦境内容</strong>：您输入的梦境描述、问答回复</li>
                  <li><strong>生成内容</strong>：AI 为您生成的故事、解读</li>
                  <li><strong>社区互动</strong>：您在梦墙发布的帖子、评论、点赞</li>
                  <li><strong>好友关系</strong>：您与其他用户的好友关系</li>
                </ul>
                <h3>1.2 自动收集的信息</h3>
                <ul>
                  <li><strong>设备信息</strong>：设备类型、操作系统、屏幕分辨率</li>
                  <li><strong>日志信息</strong>：访问时间、页面路径、功能使用情况</li>
                  <li><strong>推送订阅</strong>：Web Push 通知订阅信息</li>
                </ul>
              </section>

              <section className={styles.section}>
                <h2>二、信息使用</h2>
                <p>我们使用收集的信息用于：</p>
                <ul>
                  <li>提供、维护和改进我们的服务</li>
                  <li>生成个性化的梦境故事和解读</li>
                  <li>处理您的账号登录和安全验证</li>
                  <li>发送服务通知（如签到提醒、互动通知）</li>
                  <li>分析服务使用情况以提升用户体验</li>
                  <li>满足法律法规要求的保存期限</li>
                </ul>
              </section>

              <section className={styles.section}>
                <h2>三、信息共享</h2>
                <p>除以下情况外，我们不会与任何第三方共享您的个人信息：</p>
                <ul>
                  <li><strong>征得您同意</strong>：您明确同意后，我们才会共享</li>
                  <li><strong>匿名化处理</strong>：经过匿名化处理，无法识别您身份的信息</li>
                  <li><strong>法律要求</strong>：配合政府部门依据法律法规提出的合法要求</li>
                </ul>
                <p className={styles.note}>我们使用第三方服务：</p>
                <ul>
                  <li><strong>AI 生成服务</strong>：用于生成梦境故事（仅传输必要的故事内容）</li>
                  <li><strong>数据分析</strong>：可选的 Umami 自托管分析服务（不使用 Cookie）</li>
                  <li><strong>客服支持</strong>：可选的 Crisp.chat 在线客服（如已配置）</li>
                </ul>
              </section>

              <section className={styles.section}>
                <h2>四、信息存储</h2>
                <ul>
                  <li>您的个人信息存储在中华人民共和国境内的服务器</li>
                  <li>我们仅在实现本政策所述目的所需的最短期限内保留您的信息</li>
                  <li>超出保存期限后，您的信息将被删除或匿名化处理</li>
                  <li>梦境故事等内容将保存至您主动删除账号</li>
                </ul>
                <h3>数据保留期限</h3>
                <ul>
                  <li><strong>账号基本信息</strong>：直到您主动注销账号后30天内删除</li>
                  <li><strong>梦境记录和生成故事</strong>：直到您主动删除或注销账号</li>
                  <li><strong>梦墙帖子和评论</strong>：直到您主动删除或注销账号后30天内删除</li>
                  <li><strong>好友关系</strong>：直到您主动删除或注销账号后30天内删除</li>
                  <li><strong>通知记录</strong>：保留30天后自动删除</li>
                  <li><strong>操作日志</strong>：保留90天后自动删除</li>
                  <li><strong>积分和勋章</strong>：账号注销后立即失效，不可恢复</li>
                </ul>
              </section>

              <section className={styles.section}>
                <h2>五、信息安全</h2>
                <p>我们采用业界标准的安全措施保护您的信息：</p>
                <ul>
                  <li>HTTPS 加密传输所有通信</li>
                  <li>数据库访问权限严格控制</li>
                  <li>定期安全审计和漏洞扫描</li>
                  <li>员工访问权限最小化原则</li>
                </ul>
              </section>

              <section className={styles.section}>
                <h2>六、您的权利</h2>
                <p>依据相关法律法规，您享有以下权利：</p>
                <ul>
                  <li><strong>访问权</strong>：了解我们持有您的哪些个人信息</li>
                  <li><strong>更正权</strong>：要求更正不准确的个人信息</li>
                  <li><strong>删除权</strong>：要求删除您的个人信息（联系客服处理）</li>
                  <li><strong>导出权</strong>：在"个人中心-导出数据"中下载您的所有数据</li>
                  <li><strong>撤回同意</strong>：您可以关闭通知权限，但会影响相关功能</li>
                </ul>
              </section>

              <section className={styles.section}>
                <h2>七、Cookie 使用</h2>
                <p>我们使用 Cookie 用于：</p>
                <ul>
                  <li><strong>身份认证</strong>：保持登录状态（必要的认证 Cookie）</li>
                  <li><strong>功能偏好</strong>：记住您的主题、语言等设置</li>
                </ul>
                <p>您可以通过浏览器设置拒绝 Cookie，但这可能导致部分功能无法正常工作。</p>
                <p className={styles.note}>可选的分析和客服功能不会在您未同意前激活。</p>
              </section>

              <section className={styles.section}>
                <h2>八、未成年人保护</h2>
                <p>我们非常重视对未成年人隐私的保护。</p>
                <ul>
                  <li>我们的服务主要面向 18 周岁以上的成年人</li>
                  <li>14 周岁以下的未成年人不应使用本服务</li>
                  <li>14 至 18 周岁的未成年人应在监护人的陪同下使用本服务</li>
                  <li>我们不会故意收集未成年人的个人信息</li>
                  <li>如果您是未成年人，请在监护人的陪同下使用我们的服务</li>
                </ul>
              </section>

              <section className={styles.section}>
                <h2>九、政策更新</h2>
                <p>我们可能会不时更新本隐私政策。更新时，我们会在页面显著位置发布变更通知。请定期查阅以了解最新版本。</p>
              </section>

              <section className={styles.section}>
                <h2>十、联系我们</h2>
                <p>如果您对本隐私政策有任何疑问或建议，请通过以下方式联系我们：</p>
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
