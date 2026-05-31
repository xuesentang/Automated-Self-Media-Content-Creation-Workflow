import { Drawer, Tabs } from 'antd';
import { KnowledgeSearch } from './KnowledgeSearch';
import { KnowledgeChat } from './KnowledgeChat';
import { UserArticlesPanel } from './UserArticlesPanel';

interface KnowledgeDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function KnowledgeDrawer({ open, onClose }: KnowledgeDrawerProps) {
  return (
    <Drawer
      title="知识库"
      placement="right"
      width={600}
      onClose={onClose}
      open={open}
    >
      <Tabs
        items={[
          {
            key: 'search',
            label: '搜索',
            children: <KnowledgeSearch />,
          },
          {
            key: 'chat',
            label: '问答',
            children: <KnowledgeChat />,
          },
          {
            key: 'my-articles',
            label: '我的素材',
            children: <UserArticlesPanel />,
          },
        ]}
      />
    </Drawer>
  );
}
