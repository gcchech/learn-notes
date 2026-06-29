---
title: Git 高效使用指南
icon: code-branch
order: 2
category:
  - 开发工具
tag:
  - Git
  - 版本控制
  - 分支管理
  - rebase
  - 提交规范
---

# Git 高效使用指南：从核心概念到团队规范

> 📖 Git 是每个开发者的日常工具，但"会用"和"用好"之间有巨大的差距。本文从 Git 的核心对象模型（blob/tree/commit/tag）出发，深入理解工作区-暂存区-仓库的三层体系，覆盖 merge 与 rebase 的本质区别与选择场景、reset 三种模式的精确语义、以及 reflog 这个"后悔药"的用法，最后以 Conventional Commits 规范收尾——帮助你从 `add-commit-push` 走向真正的 Git 掌控。

---

## 一、Git 核心概念 —— 三层模型

### 1.1 工作区、暂存区、仓库

```
┌─────────────┐    git add     ┌─────────────┐    git commit    ┌─────────────┐
│   工作目录    │  ──────────▶  │    暂存区    │  ────────────▶  │   本地仓库    │
│ (Working    │               │ (Staging    │                │ (Repository) │
│  Directory) │               │  Area/Index)│                │  .git/       │
└─────────────┘               └─────────────┘                └──────┬──────┘
      │                                                             │
      │  真实文件（你编辑的）                                          │  git push
      │  红色状态 = 未跟踪/已修改                                      │  ───────▶
      │                                                             │   远程仓库
      │                            绿色状态 = 已暂存，准备提交          │  (Remote)
      └─────────────────────────────────────────────────────────────┘
```

```bash
# 每个区域的操作
git add <file>          # 工作区 → 暂存区
git commit -m "..."     # 暂存区 → 本地仓库
git push origin main    # 本地仓库 → 远程仓库

# 查看各区域状态
git status              # 工作区 vs 暂存区 vs HEAD
git diff                # 工作区 vs 暂存区（未暂存的修改）
git diff --cached       # 暂存区 vs HEAD（已暂存但未提交的）
git diff HEAD           # 工作区 vs HEAD（所有未提交的修改）
```

### 1.2 Git 的四种对象模型

Git 本质上是一个**内容寻址的文件系统**——一切皆对象，用 SHA-1 哈希值作为键：

```
┌─────────────────────────────────────────────────────────────┐
│                    Git 对象模型                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  blob（数据对象）                     tree（树对象）             │
│  ┌──────────────┐                   ┌──────────────────┐    │
│  │ 文件内容      │                   │ 目录结构           │    │
│  │ (不存文件名)   │                   │ ┌────┬────┬────┐ │    │
│  │              │                   │ │blob│blob│tree│ │    │
│  │ SHA: a1b2... │                   │ │README│Main│src│ │    │
│  └──────────────┘                   │ └────┴────┴────┘ │    │
│                                      │ SHA: c3d4...    │    │
│                                      └──────────────────┘    │
│                                                              │
│  commit（提交对象）                    tag（标签对象）           │
│  ┌──────────────────────┐           ┌──────────────┐        │
│  │ tree:   c3d4...      │           │ object: SHA  │        │
│  │ parent: e5f6...      │           │ type: commit │        │
│  │ author:  月亮         │           │ tag:  v1.0.0 │        │
│  │ message: "init"      │           │ message: ... │        │
│  │ SHA:     g7h8...     │           └──────────────┘        │
│  └──────────────────────┘                                    │
└─────────────────────────────────────────────────────────────┘
```

```bash
# 查看 Git 对象的底层命令
git cat-file -p HEAD        # 查看 HEAD 指向的 commit 对象内容
git cat-file -p HEAD^{tree} # 查看 commit 对应的 tree 对象
git ls-tree HEAD            # 列出 tree 对象中的内容
git hash-object -w README.md # 计算文件 blob 的 SHA-1

# 每次 commit 都保存了一个完整的项目快照（通过 tree → blob 引用链）
# 同名但内容不变的文件 → blob 对象 SHA 不变 → 复用 → Git 的存储很高效
```

---

## 二、常用命令深入

### 2.1 git add —— 暂存区操作

```bash
git add file.txt          # 暂存单个文件
git add .                 # 暂存当前目录所有修改
git add -A                # 暂存所有修改（包括删除）
git add -p file.txt       # 交互式暂存——分块选择（hunk by hunk）
# y = 暂存这块  n = 不暂存  s = 拆成更小块  e = 手动编辑

git reset HEAD file.txt   # 将文件从暂存区撤回工作区
git restore --staged file.txt  # 同上（Git 2.23+ 新命令，语义更清晰）
```

### 2.2 git commit —— 创建提交

```bash
git commit -m "feat: add user login"           # 提交暂存区所有内容
git commit -a -m "fix: correct typo"           # 跳过 git add，直接提交已跟踪文件的修改
git commit --amend -m "new message"            # 修改最后一次提交的 message
git commit --amend --no-edit                   # 追加修改到上一次提交（不改 message）
git commit --amend --author="月亮 <me@example.com>"  # 修改作者

# ⚠️ --amend 会改变 commit SHA → 如果已经 push 了 → 不要 amend！
# 如果要改 message：git commit --amend 后 git push --force-with-lease
```

### 2.3 git log —— 查看历史

```bash
git log --oneline --graph --all   # 简洁版图形化日志（最常用）
git log -p                         # 显示每次提交的详细 diff
git log --author="月亮"            # 按作者过滤
git log --since="2024-01-01"      # 按日期过滤
git log -S "functionName"         # 搜索包含某段代码的提交（改了什么）
git log -- path/to/file           # 只看某个文件的提交历史

# 推荐：设置别名
# git config --global alias.lg "log --oneline --graph --all"
# git lg  → 一键查看漂亮的分支图
```

---

## 三、分支模型

### 3.1 三种主流分支策略

```
Git Flow：
  main ────●────────●────────●────── (稳定版)
            \       /        /
  develop ───●──●──●──●──●──●──── (开发主线)
              \    /    \
  feature/A  ──●──●       \
  feature/B           ──●──●       (功能分支)
  release/1.0                ──●── (发布分支)
  hotfix/urgent                   ──● (紧急修复)

  适用：有固定发版周期的传统软件
  特点：分支多、流程严谨、但较重


GitHub Flow：
  main ──●─────────────●──────●────
          \             \    /
  feature/A ●──●──●      \  /
  feature/B         ●──●──●  (PR + Code Review)

  适用：持续部署的 SaaS/Web 应用
  特点：main 永远可部署，feature 分支通过 PR 合入


Trunk-Based Development（主干开发）：
  main ──●──●──●──●──●──●──●──●──
          \  /   \  /   \  /
  feature ●──●    ●──●    ●──●    (极短生命周期 < 1 天)

  适用：CI/CD 成熟、有完善的 Feature Toggle 机制
  特点：没有长期分支，每日合并，Trunk 永远是唯一真相
```

### 3.2 分支操作

```bash
git branch                    # 查看本地分支
git branch -r                 # 查看远程分支
git branch -a                 # 查看所有分支
git branch <name>             # 创建分支（基于当前 HEAD）
git branch <name> <commit>    # 从指定提交创建分支
git switch <name>             # 切换分支（Git 2.23+，推荐替代 checkout）
git switch -c <name>          # 创建并切换
git branch -d <name>          # 安全删除（已合并的分支）
git branch -D <name>          # 强制删除（即使未合并）

# 推送分支
git push origin <branch>              # 推送本地分支到远程
git push origin --delete <branch>     # 删除远程分支
git push -u origin <branch>           # 推送并建立追踪关系
```

---

## 四、合并策略 —— merge vs rebase

### 4.1 merge —— 保留完整历史

```bash
# 在 main 分支上
git merge feature/login

# 结果：创建一个新的 merge commit（两个 parent）
# main: ●──●──●──────● (merge commit)
#         \        /
# feature:  ●──●──●
#
# 特点：
#   ✅ 完整保留分支历史，知道哪些提交来自哪个分支
#   ❌ 历史图会变复杂（跨分支合并多时像"蜘蛛网"）
```

```bash
# --no-ff：总是创建 merge commit（推荐）
git merge --no-ff feature/login
# 即使可以 fast-forward 也生成 merge commit → 保留"功能分支"这个概念

# --squash：把所有提交压成一个
git merge --squash feature/login
# 工作区变为合并后的状态，但不自动 commit → 手动写一个干净的 commit message
# 特点：提交历史干净，但丢失了功能分支的细粒度提交
```

### 4.2 rebase —— 重写历史

```bash
# 在 feature 分支上
git rebase main

# rebase 前：                 rebase 后：
# main:   ●──●──●──●          main:   ●──●──●──●
#           \                             \
# feature:    ●──●──●          feature:      ●'──●'──●'
#                                              (重新"接"到 main 最新处)
#
# 原理：
#   1. 找到 feature 和 main 的共同祖先
#   2. 将 feature 上"自己独有的提交"逐个 cherry-pick 到 main 的最新提交之后
#   3. feature 指向新的提交链
#
# 特点：
#   ✅ 线性历史，干净整洁
#   ❌ 丢失了"这些提交曾经在 feature 分支上"的信息
#   ❌ ⚠️ 如果 feature 已经 push → 不要 rebase！（会改变 SHA → 冲突他人）
```

```
merge vs rebase 选择指南：

  用 merge（--no-ff）：
    → 多人协作的功能分支合并到 main
    → 需要保留完整的"功能分支"概念
    → 团队规范：不排斥非线性历史

  用 rebase：
    → 个人开发的功能分支，在合并前整理提交
    → 把"fix typo""fix test"压成一个有意义的提交
    → 习惯交互式 rebase 整理提交记录后再合入 main

  核心原则：
    绝不要 rebase 已经 push 过的分支！
    绝不要 rebase 已经 push 过的分支！
    绝不要 rebase 已经 push 过的分支！
```

### 4.3 交互式 rebase —— 整理提交历史

```bash
# 整理最近 3 个提交
git rebase -i HEAD~3

# 编辑器打开：
# pick a1b2c3 feat: add login
# pick d4e5f6 fix: typo in login
# pick g7h8i9 fix: another typo
#
# 修改为：
# pick a1b2c3 feat: add login
# squash d4e5f6 fix: typo in login       ← 合并到前一个提交
# squash g7h8i9 fix: another typo         ← 合并到前一个提交
#
# 保存后 → 三个提交会合并为一个 → 编辑新的 commit message

# 命令说明：
# pick   = 保留这个提交
# reword = 保留但修改 message
# squash = 合并到上一个提交，保留 message
# fixup  = 合并到上一个提交，丢弃该 message
# drop   = 删除这个提交
# edit   = 保留但暂停，让你修改
```

---

## 五、撤销操作 —— reset、revert、reflog

### 5.1 git reset —— 移动分支指针

```
git reset 的三个模式（影响范围从大到小）：

HEAD → commit A → commit B → commit C（当前）
                                     ┊
git reset --soft HEAD~1       ┊  分支指针回退 1 步
                               ┊  ┌────────┬──────────┬──────────┐
                               ┊  │        │ 工作区    │ 暂存区    │
                               ┊  │ 影响   │ 不变      │ 不变      │
                               ┊  │ 场景   │ 把多个 commit 合并为一个 │
                               ┊  └────────┴──────────┴──────────┘

git reset --mixed HEAD~1（默认）┊  ┌────────┬──────────┬──────────┐
                               ┊  │        │ 工作区    │ 暂存区    │
                               ┊  │ 影响   │ 不变      │ 清空      │
                               ┊  │ 场景   │ 撤销 commit 和 add   │
                               ┊  └────────┴──────────┴──────────┘

git reset --hard HEAD~1       ┊  ┌────────┬──────────┬──────────┐
                               ┊  │        │ 工作区    │ 暂存区    │
                               ┊  │ 影响   │ ❌ 清空   │ ❌ 清空   │
                               ┊  │ 场景   │ 彻底回到过去(危险!)  │
                               ┊  └────────┴──────────┴──────────┘
```

```bash
git reset --soft HEAD~1     # 撤销 commit，修改保留在暂存区（重新 commit 的好机会）
git reset HEAD~1             # 撤销 commit + 撤销暂存（-mixed 是默认）
git reset --hard HEAD~1     # ⚠️ 彻底丢弃所有未提交的修改

git reset HEAD file.txt      # 撤销暂存区的文件（不影响工作区）
git checkout -- file.txt     # 撤销工作区的修改（恢复到暂存区/HEAD 的状态）
git restore file.txt         # Git 2.23+ 推荐：撤销工作区修改
```

### 5.2 git revert —— 安全撤销

```bash
# revert 不是"删除"commit，而是创建一个新的反向 commit
git revert HEAD              # 创建一个新的 commit，内容是"撤销上一次提交的修改"

# 与 reset 的关键区别：
#   reset  → 删除 commit，改写历史（如果已 push → 需要 force push）
#   revert → 新增 commit，历史追加（安全，不会影响协作者）
#
#   ⭐ 已经 push 到远程的 commit → 绝对不要 reset → 用 revert！
```

### 5.3 git stash —— 临时保存

```bash
git stash                    # 暂存所有修改 → 工作区恢复干净
git stash save "WIP: login"  # 带说明的暂存
git stash list               # 查看所有暂存
git stash pop                # 恢复最近的暂存 + 删除该 stash
git stash apply              # 恢复最近的暂存 + 保留该 stash
git stash drop               # 删除最近的暂存
git stash pop stash@{1}      # 恢复指定 stash
```

### 5.4 git reflog —— 终极后悔药

```bash
git reflog
# 输出：
# a1b2c3 HEAD@{0}: commit: feat: add login
# d4e5f6 HEAD@{1}: commit: fix typo
# g7h8i9 HEAD@{2}: reset: moving to HEAD~1
# ...
# 记录了 HEAD 的所有移动历史（包括被 reset 掉的提交！）

# 找回被 reset --hard 丢掉的提交
git reflog                          # 找到丢失 commit 的 SHA
git reset --hard a1b2c3             # 回到那个 commit
# 或
git branch recovered-branch a1b2c3  # 创建一个新分支指向它
```

> 🎯 **reflog 是 Git 的"时光机"**——只要 commit 过，即使 reset --hard 也能找回。reflog 默认保留 90 天（不可达对象是 30 天）。

---

## 六、冲突解决

```bash
# 冲突标记格式
# <<<<<<< HEAD（或当前分支名）
#   当前分支的代码
# =======
#   合并进来的分支的代码
# >>>>>>> feature/login（被合并的分支名）
```

```bash
# 冲突解决流程
git merge feature/login       # → CONFLICT 提示
git status                    # 查看冲突文件列表

# 手动编辑冲突文件 → 删除标记 → 保存
# <<<<<<< HEAD
#   你的修改
# =======
#   冲突的修改
# >>>>>>> feature/login
# → 根据业务逻辑修改为正确版本

git add <resolved-file>       # 标记为已解决
git commit                    # 完成合并（message 自动生成）

# 放弃合并
git merge --abort

# 使用 mergetool（如 VS Code 内置的三路合并视图）
git mergetool
```

---

## 七、实用技巧

### 7.1 cherry-pick —— 摘取提交

```bash
# 将指定 commit 的修改应用到当前分支
git cherry-pick <commit-sha>

# 场景：hotfix 的修改需要同时合到 main 和 develop
# main:    ●──●──●──● (hotfix)
# develop: ●──●──●
# → git switch develop
# → git cherry-pick <hotfix-commit-sha>
# → hotfix 的修改被复制到了 develop
```

### 7.2 git bisect —— 二分定位问题提交

```bash
# 自动二分查找引入 bug 的提交
git bisect start
git bisect bad HEAD            # 当前版本是有问题的
git bisect good v1.0.0         # v1.0.0 是没问题的

# Git 自动 checkout 到中间某个 commit
# 测试 → git bisect good（没问题）或 git bisect bad（有问题）
# 重复几次 → Git 定位到引入 bug 的第一个 commit

git bisect reset               # 结束后恢复
```

### 7.3 git blame —— 查看每行代码的作者

```bash
git blame src/UserService.java               # 每行代码是谁、什么时候改的
git blame -L 10,50 src/UserService.java      # 只看第 10~50 行
git blame -L '/public User/',/^}/' UserService.java  # 从 public User 到 }（正则范围）
```

### 7.4 .gitignore 规则

```bash
# .gitignore
*.class               # 所有 .class 文件
*.log                 # 所有 .log 文件
target/               # Maven 构建输出
.idea/                # IDEA 配置
*.iml                 # IDEA 模块文件
node_modules/         # Node 依赖
.env                  # 环境变量（含密码）

# 规则：
# /build     → 只忽略根目录的 build
# build/     → 忽略所有名为 build 的目录
# *.txt      → 忽略所有 .txt 文件
# !important.txt → 但不忽略 important.txt（!取反）
```

### 7.5 Git Hooks

```bash
# .git/hooks/ 目录下的脚本 → 在特定 Git 事件触发时自动执行

# pre-commit：提交前 → 代码检查、格式化
#!/bin/bash
mvn spotless:check  # 格式检查
if [ $? -ne 0 ]; then
    echo "代码格式不符合规范，请运行 mvn spotless:apply"
    exit 1
fi

# commit-msg：提交信息验证
#!/bin/bash
# 检查 commit message 是否符合规范
commit_regex='^(feat|fix|docs|style|refactor|test|chore|perf|ci)(\(.+\))?: .{1,50}'
if ! grep -qE "$commit_regex" "$1"; then
    echo "Commit message 不符合规范！请使用 feat/fix/docs/... 开头"
    exit 1
fi

# ⚠️ .git/hooks/ 不会被 git 跟踪 → 团队共享需借助工具（如 pre-commit、husky）
```

---

## 八、提交规范 —— Conventional Commits

```
标准格式：
  <type>(<scope>): <short summary>

  type（必选）：
    feat     = 新功能
    fix      = 修复 bug
    docs     = 文档修改
    style    = 代码格式（不影响功能，如空格/分号）
    refactor = 重构（既不是新功能也不是修 bug）
    test     = 添加测试或修改现有测试
    chore    = 构建过程或辅助工具的变动（依赖更新等）
    perf     = 性能优化
    ci       = CI 配置变更
    build    = 构建系统或外部依赖的变更

  scope（可选）：影响范围 → feat(auth): add OAuth2 login

  body（可选，空一行后）：
    详细描述：为什么要做这个变更？怎么做的？

  footer（可选）：
    BREAKING CHANGE: 描述不兼容的变更
    Closes #123      关联 Issue
```

```bash
# 好的 commit message
feat(auth): add JWT token refresh mechanism
fix(order): prevent duplicate order submission under race condition
refactor(user): extract validation logic to UserValidator
docs(api): document new error codes in REST API
perf(query): add composite index on (user_id, created_at)

# 不好的 commit message（真实的反面教材）
fix bug
update code
.
WIP
asdf
```

---

## 九、总结

| 知识点 | 核心要点 |
|--------|---------|
| **三层模型** | 工作区 → `git add` → 暂存区 → `git commit` → 本地仓库 → `git push` → 远程仓库 |
| **对象模型** | blob(内容) → tree(目录) → commit(快照) → tag(标签)；内容寻址，相同内容共享 blob |
| **merge vs rebase** | merge 保留历史但可能复杂；rebase 历史线性但**绝不能 rebase 已 push 的分支** |
| **reset 三模式** | soft（撤销 commit 保留暂存）、mixed（撤销 commit+add）、hard（彻底⚠️） |
| **revert** | 安全撤销——新增反向 commit，不重写历史 |
| **reflog** | Git 的时光机——记录所有 HEAD 移动，可找回 reset --hard 丢掉的提交 |
| **cherry-pick** | 摘取指定 commit 到当前分支——hotfix 双线同步 |
| **bisect** | 二分查找引入 bug 的提交——自动化 test → good/bad → 定位 |
| **分支策略** | Git Flow(严谨) / GitHub Flow(敏捷) / Trunk-Based(极简)；团队选一种统一执行 |
| **提交规范** | Conventional Commits：`type(scope): message`；推荐配置 commit-msg hook 自动校验 |

**Git 的三个黄金原则**：
1. **不要 rebase 已 push 的分支**——除非是个人分支且你知道后果
2. **在 push 前用交互式 rebase 整理提交**——把"fix typo"变成有意义的历史
3. **commit message 写给未来的自己看**——6 个月后你会感谢现在的自己

下一篇将进入 **IntelliJ IDEA 高效开发**——从核心快捷键到重构技巧，从调试艺术到插件推荐。

---

## 参考

- [Git — Pro Git Book (中文版)](https://git-scm.com/book/zh/v2)
- [Conventional Commits](https://www.conventionalcommits.org/zh-hans/v1.0.0/)
- [GitHub Flow](https://docs.github.com/en/get-started/using-github/github-flow)
- [Atlassian — Git Tutorials](https://www.atlassian.com/git/tutorials)
- [Git — Official Reference](https://git-scm.com/docs)
