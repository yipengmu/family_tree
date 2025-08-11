import React, { useState } from 'react';
import AppLayout from '../Layout/AppLayout';
import './DiscoverPage.css';

const DiscoverPage = ({ activeMenuItem = 'discover', onMenuClick }) => {
  const [following, setFollowing] = useState(false);

  // 模拟用户数据
  const currentUser = {
    name: '穆培爸',
    location: '河南',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&crop=face',
    coverImage: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=800&h=300&fit=crop',
    followers: 1234,
    following: 567,
    posts: 89,
    birthDate: '4月10日 1989',
    address: '浙江杭州 2239 Hog Camp Road',
    email: '邮箱',
    phone: '小红书, 微信'
  };

  // 模拟动态数据
  const posts = [
    {
      id: 1,
      user: {
        name: 'Charles Deo',
        avatar: '/api/placeholder/40/40',
        time: '15mins ago'
      },
      content: 'New Blazer out here... $500!!!!!!',
      image: '/api/placeholder/400/300',
      likes: 1498,
      comments: 3000
    },
    {
      id: 2,
      user: {
        name: 'Charles Deo',
        avatar: '/api/placeholder/40/40',
        time: '3mins ago'
      },
      content: 'Amazing family gathering today! 🎉',
      image: '/api/placeholder/400/300',
      likes: 892,
      comments: 156
    }
  ];

  // 模拟推荐用户
  const suggestedUsers = [
    { name: '穆小军', email: 'xiaojun@example.com', avatar: '/api/placeholder/32/32' },
    { name: '穆大伟', email: 'dawei@example.com', avatar: '/api/placeholder/32/32' },
    { name: '穆静雅', email: 'jingya@example.com', avatar: '/api/placeholder/32/32' }
  ];

  // 模拟活跃用户
  const activeUsers = [
    { name: '穆贝娅', status: 'Online', avatar: '/api/placeholder/32/32' },
    { name: 'Robert Bacins', status: 'Busy', avatar: '/api/placeholder/32/32' },
    { name: 'John Carilo', status: 'Online', avatar: '/api/placeholder/32/32' },
    { name: 'Adriene Watson', status: 'Offline', avatar: '/api/placeholder/32/32' }
  ];

  const handleFollow = () => {
    setFollowing(!following);
  };

  return (
    <AppLayout activeMenuItem={activeMenuItem} onMenuClick={onMenuClick}>
      <div className="discover-page">
        {/* 封面图片 */}
        <div className="discover-cover" />

        {/* 三列布局 */}
        <div className="discover-grid">
          {/* 左侧：个人资料 + About */}
          <div className="left-column">
            {/* 个人资料卡片 */}
            <div className="profile-card-box">
              <img src={currentUser.avatar} alt={currentUser.name} className="profile-card-avatar" />
              <h2 className="profile-card-name">{currentUser.name}</h2>
              <p className="profile-card-location">祖籍：{currentUser.location}</p>
              <div className="profile-card-actions">
                <button className="message-btn" aria-label="消息">
                  {/* chat icon */}
                  <svg className="icon" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>
                </button>
                <button className="follow-btn" onClick={handleFollow}>{following ? '已关注' : '关注'}</button>
                <button className="family-btn">家族大事记</button>
              </div>
            </div>

            {/* About 卡片 */}
            <div className="about-card-box">
              <h3 className="about-title">About</h3>
              <div className="about-list">
                <div className="about-row">
                  <svg className="icon purple" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                  <span className="about-text">{currentUser.name}</span>
                </div>
                <div className="about-row">
                  <svg className="icon purple" viewBox="0 0 24 24" fill="currentColor"><path d="M9 11H7v6h2v-6zm4 0h-2v6h2v-6zm4 0h-2v6h2v-6zm2-7H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zM19 20H5V8h14v12z"/></svg>
                  <span className="about-text">Born {currentUser.birthDate}</span>
                </div>
                <div className="about-row">
                  <svg className="icon purple" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                  <span className="about-text">{currentUser.address}</span>
                </div>
                <div className="about-row">
                  <svg className="icon purple" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                  <span className="about-text">{currentUser.email}</span>
                </div>
                <div className="about-row">
                  <svg className="icon purple" viewBox="0 0 24 24" fill="currentColor"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
                  <span className="about-text">{currentUser.phone}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 中间：帖子 */}
          <div className="center-column">
            <div className="feed-tabs">
              <button className="tab">Followers</button>
              <button className="tab">Following</button>
              <button className="tab active">Posts</button>
            </div>

            <div className="posts-list">
              {posts.map((post) => (
                <div key={post.id} className="post-card">
                  <div className="post-header">
                    <div className="post-user">
                      <img src={post.user.avatar} alt={post.user.name} className="post-avatar" />
                      <div>
                        <div className="post-user-name">{post.user.name}</div>
                        <div className="post-time">{post.user.time}</div>
                      </div>
                    </div>
                    <button className="more-btn" aria-label="更多">
                      <svg className="icon" viewBox="0 0 24 24" fill="#490057"><path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
                    </button>
                  </div>

                  {post.image && <img src={post.image} alt="Post" className="post-image" />}

                  <p className="post-text"><strong>{post.user.name}</strong> {post.content}</p>

                  <div className="post-actions-row">
                    <div className="action">
                      <svg className="icon" viewBox="0 0 28 28" fill="#a303a0"><path d="M19.25 3.5C17.22 3.5 15.2717 4.445 14 5.93833C12.7283 4.445 10.78 3.5 8.75 3.5C5.15667 3.5 2.33333 6.32333 2.33333 9.91667C2.33333 14.3267 6.3 17.92 12.3083 23.38L14 24.9083L15.6917 23.3683C21.7 17.92 25.6667 14.3267 25.6667 9.91667C25.6667 6.32333 22.8433 3.5 19.25 3.5Z"/></svg>
                      <span className="action-text">{post.likes.toLocaleString()}</span>
                    </div>
                    <div className="action">
                      <svg className="icon" viewBox="0 0 28 28" fill="#a303a0"><path d="M23.3333 2.33333H4.66667C3.38333 2.33333 2.33333 3.38333 2.33333 4.66667V25.6667L7 21H23.3333C24.6167 21 25.6667 19.95 25.6667 18.6667V4.66667C25.6667 3.38333 24.6167 2.33333 23.3333 2.33333Z"/></svg>
                      <span className="action-text">{post.comments.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 右侧：边栏 */}
          <div className="right-column">
            <div className="side-card">
              <h3 className="side-title">你可能认识</h3>
              <div className="side-list">
                {suggestedUsers.map((user, idx) => (
                  <div key={idx} className="side-row with-border">
                    <img src={user.avatar} alt={user.name} className="side-avatar" />
                    <div className="side-meta">
                      <div className="side-name">{user.name}</div>
                      <div className="side-sub">{user.email}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="side-card">
              <h3 className="side-title">活跃</h3>
              <div className="side-list">
                {activeUsers.map((user, idx) => (
                  <div key={idx} className="side-row with-border">
                    <img src={user.avatar} alt={user.name} className="side-avatar" />
                    <div className="side-meta">
                      <div className="side-name">{user.name}</div>
                      <div className="side-sub">{user.status}</div>
                    </div>
                    <span className={`status-dot ${user.status === 'Online' ? 'online' : user.status === 'Busy' ? 'busy' : 'offline'}`} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default DiscoverPage;
