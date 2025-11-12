const { chromium } = require('playwright');
const fs = require('fs');

// 更新选择器配置
const SELECTORS = {
    SEARCH_PAGE: {
        container: '.feeds-container',
        postItem: 'section.note-item',
        postLink: 'a.cover.mask.ld',
        postTitle: 'a.title'
    },
    POST_DETAIL: {
        title: 'h1, [class*="title"]',
        content: '.content-edit',
        likes: '.like-wrapper .count',
        favorites: '.collect-wrapper .count',
        comments: '.chat-wrapper .count',
        authorLink: '.author-info a, [class*="author"] a'
    },
    COMMENTS: {
        container: '.comment-list, [class*="comment"]',
        item: '.comment-item, [class*="comment-item"]',
        content: '.content, [class*="content"]',
        likes: '.like-count, [class*="like"]',
        replyContainer: '.reply-container',
        replyItem: '.comment-item', // 子评论也使用 comment-item 类
        replyContent: '.note-text, .content'
    
    },
    AUTHOR_PAGE: {
        postsContainer: '.feeds-container, [class*="container"]',
        postItem: 'section.note-item, [class*="note"]',
        postTitle: 'a.title, [class*="title"]'
    }
};

// 获取关键词函数
function getKeyword() {
    const args = process.argv.slice(2);
    return args.length > 0 ? args[0] : "前端";
}

// 清理帖子ID函数
function cleanPostId(url) {
    // 提取 /explore/ 后面的部分，并去除参数
    const match = url.match(/\/explore\/([^?]+)/);
    if (match && match[1]) {
        return match[1];
    }
    return url.split('/').pop().split('?')[0] || '未知ID';
}

async function main() {
    let keyword = getKeyword();
    console.log(`🎯 使用关键词: "${keyword}"`);
    
    const browser = await chromium.launch({ 
        headless: false,
        slowMo: 1000,
        timeout: 120000
    });
    
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        viewport: { width: 1200, height: 800 }
    });
    
    const page = await context.newPage();
    page.setDefaultTimeout(60000);
    page.setDefaultNavigationTimeout(60000);
    
    try {
        console.log('开始小红书信息搜集...');
        
        console.log(`搜索关键词: ${keyword}`);
        
        await page.goto(`https://www.xiaohongshu.com/search_result/?keyword=${encodeURIComponent(keyword)}`, {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });
        
        console.log('等待页面加载...');
        await page.waitForTimeout(8000);
        
        const pageTitle = await page.title();
        console.log(`页面标题: ${pageTitle}`);
        
        const currentUrl = page.url();
        console.log(`当前URL: ${currentUrl}`);
        
        // 截图以便调试
        await page.screenshot({ path: 'debug_page.png' });
        console.log('页面截图已保存为 debug_page.png');
        
        // 获取帖子列表
        console.log(' 获取帖子列表...');
        const postList = await getPostList(page);
        console.log(`找到 ${postList.length} 个帖子`);
        
        const allPostsData = [];
        
        // 逐个处理帖子
        for (let i = 0; i < Math.min(5, postList.length); i++) {
            const post = postList[i];
            console.log(`\n📄 处理第 ${i + 1} 个帖子: ${post.title}`);
            
            if (!post.link) {
                console.log('❌ 帖子链接为空，跳过');
                continue;
            }
            
            try {
                // 抓取帖子详情
                const postDetails = await scrapePostDetails(page, post.link);
                
                if (postDetails) {
                    console.log('✅ 帖子详情抓取成功');
                    console.log(`📊 统计数据 - 点赞: ${postDetails.stats.likes}, 收藏: ${postDetails.stats.favorites}, 评论: ${postDetails.stats.comments}`);
                    
                    // 抓取评论信息
                    const comments = await scrapeComments(page);
                    console.log(`💬 找到 ${comments.length} 条评论`);
                    
                    // 抓取作者近期作品
                    let authorRecentPosts = [];
                    if (postDetails.authorLink && postDetails.authorLink.includes('/user/profile/')) {
                        authorRecentPosts = await scrapeAuthorRecentPosts(page, postDetails.authorLink);
                        console.log(`👤 找到作者 ${authorRecentPosts.length} 个近期作品`);
                    } else {
                        console.log('👤 未找到作者主页链接或链接格式不正确');
                    }
                    
                    // 整合数据
                    const postData = {
                        id: postDetails.id,
                        title: postDetails.title,
                        content: postDetails.content,
                        stats: postDetails.stats,
                        comments: comments,
                        authorRecentPosts: authorRecentPosts,
                        keyword: keyword
                    };
                    
                    allPostsData.push(postData);
                    console.log('✅ 帖子数据处理完成');
                }
            } catch (error) {
                console.error(`❌ 处理帖子失败: ${error.message}`);
            }
            
            await page.waitForTimeout(2000);
        }
        
        // 输出结果
        console.log('\n📊 数据抓取完成！');
        console.log(`📈 共抓取 ${allPostsData.length} 个帖子的数据`);
        
        if (allPostsData.length > 0) {
            const safeKeyword = keyword.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
            const filename = `xiaohongshu_${safeKeyword}_data.json`;
            fs.writeFileSync(filename, JSON.stringify(allPostsData, null, 2));
            console.log(`💾 数据已保存到 ${filename}`);
            
            // 显示摘要
            console.log('\n📋 抓取结果摘要:');
            allPostsData.forEach((post, index) => {
                console.log(`${index + 1}. ${post.title}`);
                console.log(`   ID: ${post.id}`);
                console.log(`   点赞: ${post.stats.likes} | 收藏: ${post.stats.favorites} | 评论: ${post.stats.comments}`);
                console.log(`   评论数: ${post.comments.length}`);
                console.log(`   作者作品数: ${post.authorRecentPosts.length}`);
            });
        } else {
            console.log('❌ 没有成功抓取到任何数据');
        }
        
    } catch (error) {
        console.error('❌ 程序运行出错:', error);
    } finally {
        await browser.close();
        console.log('🔚 浏览器已关闭');
    }
}

// 获取帖子列表
async function getPostList(page) {
    try {
        await page.waitForSelector(SELECTORS.SEARCH_PAGE.container, { 
            timeout: 15000 
        }).catch(async () => {
            console.log('⚠️ 未找到标准容器，尝试直接查找帖子项...');
            const items = await page.$$(SELECTORS.SEARCH_PAGE.postItem);
            if (items.length > 0) {
                console.log(`🎯 直接找到 ${items.length} 个帖子项`);
                return items;
            }
            throw new Error('无法找到帖子列表');
        });
        
        const postCards = await page.$$(SELECTORS.SEARCH_PAGE.postItem);
        console.log(`🎯 找到 ${postCards.length} 个帖子卡片`);
        
        const postList = [];
        
        for (const card of postCards.slice(0, 5)) {
            try {
                // 获取帖子链接
                const linkElement = await card.$(SELECTORS.SEARCH_PAGE.postLink);
                let href = await linkElement?.getAttribute('href');
                
                // 处理相对链接
                if (href && !href.startsWith('http')) {
                    href = `https://www.xiaohongshu.com${href}`;
                }
                
                // 获取帖子标题
                const titleElement = await card.$(SELECTORS.SEARCH_PAGE.postTitle);
                let title = await titleElement?.textContent() || '无标题';
                
                postList.push({
                    title: title.trim(),
                    link: href
                });
                
            } catch (error) {
                console.log('⚠️ 解析单个帖子卡片失败:', error.message);
            }
        }
        
        return postList;
        
    } catch (error) {
        console.error('❌ 获取帖子列表失败:', error);
        return [];
    }
}

// 抓取帖子详情
async function scrapePostDetails(page, postUrl) {
    console.log(`🔗 访问帖子: ${postUrl}`);
    
    try {
        await page.goto(postUrl, { 
            waitUntil: 'domcontentloaded',
            timeout: 30000 
        });
        await page.waitForTimeout(3000);
        
        // 使用清理函数提取帖子ID
        const postId = cleanPostId(postUrl);
        
        // 提取帖子标题
        const title = await page.$eval(SELECTORS.POST_DETAIL.title, el => el.textContent.trim()).catch(() => '无标题');
        
        // 提取帖子内容
        const content = await page.$eval(SELECTORS.POST_DETAIL.content, el => el.textContent.trim()).catch(() => '无内容');
        
        // 提取统计数据
        let likes = '0';
        let favorites = '0';
        let commentsCount = '0';
        
        try {
            likes = await page.$eval(SELECTORS.POST_DETAIL.likes, el => el.textContent.trim());
        } catch (e) {
            console.log('⚠️ 无法获取点赞数，使用默认值0');
        }
        
        try {
            favorites = await page.$eval(SELECTORS.POST_DETAIL.favorites, el => el.textContent.trim());
        } catch (e) {
            console.log('⚠️ 无法获取收藏数，使用默认值0');
        }
        
        try {
            commentsCount = await page.$eval(SELECTORS.POST_DETAIL.comments, el => el.textContent.trim());
        } catch (e) {
            console.log('⚠️ 无法获取评论数，使用默认值0');
        }
        
        // 提取作者信息
        const authorLink = await page.$eval(SELECTORS.POST_DETAIL.authorLink, el => el.href).catch(() => '');
        
        return {
            id: postId,
            title,
            content,
            stats: {
                likes: parseInt(likes) || 0,
                favorites: parseInt(favorites) || 0,
                comments: parseInt(commentsCount) || 0
            },
            authorLink
        };
        
    } catch (error) {
        console.error(`❌ 抓取帖子详情失败: ${error.message}`);
        return null;
    }
}

// 抓取评论信息 - 改进版本
async function scrapeComments(page) {
    try {
        // 等待评论区域加载
        await page.waitForSelector(SELECTORS.COMMENTS.container, { timeout: 5000 }).catch(() => {
            console.log('⚠️ 评论区域未找到，可能没有评论或需要登录');
            return [];
        });
        
        const commentElements = await page.$$(SELECTORS.COMMENTS.item);
        console.log(`💬 找到 ${commentElements.length} 个评论元素`);
        
        const comments = [];
        for (const commentEl of commentElements) {
            try {
                const content = await commentEl.$eval(SELECTORS.COMMENTS.content, el => el.textContent.trim()).catch(() => '');
                const likes = await commentEl.$eval(SELECTORS.COMMENTS.likes, el => {
                    const text = el.textContent.trim();
                    return text || '0';
                }).catch(() => '0');
                
                // 抓取子评论 - 改进方法
                const replies = await scrapeReplies(commentEl);
                
                comments.push({
                    content,
                    likes: parseInt(likes) || 0,
                    replies
                });
                
            } catch (error) {
                console.log('⚠️ 解析单条评论失败:', error.message);
            }
        }
        
        return comments;
        
    } catch (error) {
        console.error('❌ 抓取评论失败:', error);
        return [];
    }
}

// 抓取子评论 - 新增函数
async function scrapeReplies(commentEl) {
    const replies = [];
    
    try {
        // 尝试多种方式查找子评论
        const replySelectors = [
            SELECTORS.COMMENTS.reply,
            '.reply-item',
            '[class*="reply"]',
            '.sub-comment',
            '[class*="child"]'
        ];
        
        for (const selector of replySelectors) {
            const replyElements = await commentEl.$$(selector);
            if (replyElements.length > 0) {
                console.log(`   🔍 使用选择器 "${selector}" 找到 ${replyElements.length} 条子评论`);
                
                for (const replyEl of replyElements) {
                    try {
                        const replyContent = await replyEl.$eval(SELECTORS.COMMENTS.content, el => el.textContent.trim()).catch(() => '');
                        const replyLikes = await replyEl.$eval(SELECTORS.COMMENTS.likes, el => {
                            const text = el.textContent.trim();
                            return text || '0';
                        }).catch(() => '0');
                        
                        if (replyContent) {
                            replies.push({
                                content: replyContent,
                                likes: parseInt(replyLikes) || 0
                            });
                        }
                    } catch (error) {
                        // 忽略单条子评论的错误
                    }
                }
                break; // 找到一个有效的选择器后就停止
            }
        }
        
    } catch (error) {
        console.log('⚠️ 抓取子评论失败:', error.message);
    }
    
    return replies;
}

// 抓取作者近期作品 - 改进版本
async function scrapeAuthorRecentPosts(page, authorUrl) {
    console.log(`👤 访问作者主页: ${authorUrl}`);
    
    try {
        await page.goto(authorUrl, { 
            waitUntil: 'domcontentloaded',
            timeout: 30000 
        });
        await page.waitForTimeout(3000);
        
        // 截图作者主页以便调试
        await page.screenshot({ path: 'debug_author_page.png' });
        console.log('📷 作者主页截图已保存为 debug_author_page.png');
        
        // 滚动页面以加载更多内容
        await page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight / 2);
        });
        await page.waitForTimeout(2000);
        
        // 获取作者最近的作品 - 使用更灵活的选择器
        let postElements = await page.$$(SELECTORS.AUTHOR_PAGE.postItem);
        
        // 如果没找到，尝试其他选择器
        if (postElements.length === 0) {
            console.log('⚠️ 使用标准选择器未找到作品，尝试备用选择器...');
            const alternativeSelectors = [
                'section.note-item',
                'div[class*="note"]',
                'a[href*="/explore/"]',
                '[class*="feed"]'
            ];
            
            for (const selector of alternativeSelectors) {
                const elements = await page.$$(selector);
                if (elements.length > 0) {
                    console.log(`🎯 使用备用选择器 "${selector}" 找到 ${elements.length} 个作品`);
                    postElements = elements;
                    break;
                }
            }
        }
        
        console.log(`📝 在作者主页找到 ${postElements.length} 个作品`);
        
        const recentPosts = [];
        
        for (let i = 0; i < Math.min(10, postElements.length); i++) {
            try {
                let title = '无标题';
                
                // 尝试多种方式获取标题
                try {
                    title = await postElements[i].$eval(SELECTORS.AUTHOR_PAGE.postTitle, el => el.textContent.trim());
                } catch (e) {
                    // 如果标准选择器失败，尝试其他方式
                    const anyText = await postElements[i].textContent();
                    if (anyText && anyText.trim().length > 0) {
                        title = anyText.trim().substring(0, 30) + '...';
                    }
                }
                
                if (title && title !== '无标题') {
                    recentPosts.push(title);
                }
            } catch (error) {
                console.log('⚠️ 解析作者作品标题失败');
            }
        }
        
        return recentPosts;
        
    } catch (error) {
        console.error('❌ 抓取作者作品失败:', error);
        return [];
    }
}

// 运行主函数
main().catch(console.error);