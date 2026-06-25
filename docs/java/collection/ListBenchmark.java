import java.util.*;

/**
 * ArrayList vs LinkedList 尾部追加性能验证
 *
 * 改进点：
 * 1. 使用 System.nanoTime() 替代 currentTimeMillis()
 * 2. 增加 JVM 预热轮次
 * 3. 多次迭代取平均/中位数
 * 4. 增加预设容量的 ArrayList（这才是最佳实践）
 * 5. 显式触发 GC 减少干扰
 */
public class ListBenchmark {
    static final int SIZE = 100_000;
    static final int WARMUP_ROUNDS = 5;
    static final int TEST_ROUNDS = 10;

    public static void main(String[] args) {
        System.out.println("=== JVM 预热（避免 JIT 编译影响测量） ===");
        for (int r = 0; r < WARMUP_ROUNDS; r++) {
            warmup();
            System.out.print(".");
        }
        System.out.println(" 完成\n");

        System.out.println("=== 正式测试（" + TEST_ROUNDS + " 轮）===");
        List<Long> alResults     = new ArrayList<>();
        List<Long> alPreResults  = new ArrayList<>();
        List<Long> llResults     = new LinkedList<>();

        for (int r = 0; r < TEST_ROUNDS; r++) {
            System.gc(); // 尽量让 GC 在测试前发生
            try { Thread.sleep(50); } catch (InterruptedException e) {}

            long t1 = testArrayListTailAdd();
            alResults.add(t1);
            System.out.printf("  第%d轮  ArrayList(无预设容量)  尾部追加: %,.0f ns (%d ms)%n",
                r+1, (double)t1, t1/1_000_000);

            long t2 = testArrayListPresized();
            alPreResults.add(t2);
            System.out.printf("  第%d轮  ArrayList(预设容量)     尾部追加: %,.0f ns (%d ms)%n",
                r+1, (double)t2, t2/1_000_000);

            long t3 = testLinkedListTailAdd();
            llResults.add(t3);
            System.out.printf("  第%d轮  LinkedList              尾部追加: %,.0f ns (%d ms)%n%n",
                r+1, (double)t3, t3/1_000_000);
        }

        System.out.println("=== 汇总统计 ===");
        printStats("ArrayList(无预设容量)  尾部追加", alResults);
        printStats("ArrayList(预设容量)     尾部追加", alPreResults);
        printStats("LinkedList              尾部追加", llResults);

        // 结论
        long alMedian = median(alResults);
        long llMedian = median(llResults);
        System.out.println("\n=== 结论 ===");
        if (alMedian < llMedian) {
            System.out.printf("✅ ArrayList 尾部追加中位数更快: %,.0f ns vs %,.0f ns (LinkedList 慢 %.1f 倍)%n",
                (double)alMedian, (double)llMedian, (double)llMedian/alMedian);
        } else {
            System.out.printf("❌ LinkedList 尾部追加中位数更快: %,.0f ns vs %,.0f ns (ArrayList 慢 %.1f 倍)%n",
                (double)llMedian, (double)alMedian, (double)alMedian/llMedian);
        }
        System.out.println("（ArrayList 预设容量可消除扩容开销，是实际开发中的推荐写法）");
    }

    // --- 测试方法 ---

    static long testArrayListTailAdd() {
        long start = System.nanoTime();
        List<Integer> list = new ArrayList<>();  // 无预设容量（模拟文章代码）
        for (int i = 0; i < SIZE; i++) {
            list.add(i);
        }
        return System.nanoTime() - start;
    }

    static long testArrayListPresized() {
        long start = System.nanoTime();
        List<Integer> list = new ArrayList<>(SIZE);  // 预设容量（最佳实践）
        for (int i = 0; i < SIZE; i++) {
            list.add(i);
        }
        return System.nanoTime() - start;
    }

    static long testLinkedListTailAdd() {
        long start = System.nanoTime();
        List<Integer> list = new LinkedList<>();
        for (int i = 0; i < SIZE; i++) {
            list.add(i);
        }
        return System.nanoTime() - start;
    }

    static void warmup() {
        // 用不同数据量预热，触发各种 JIT 编译
        for (int n = 1000; n <= 50000; n += 10000) {
            List<Integer> al = new ArrayList<>();
            for (int i = 0; i < n; i++) al.add(i);
            List<Integer> ll = new LinkedList<>();
            for (int i = 0; i < n; i++) ll.add(i);
        }
    }

    // --- 统计工具 ---

    static void printStats(String label, List<Long> results) {
        List<Long> sorted = new ArrayList<>(results);
        Collections.sort(sorted);
        long min = sorted.get(0);
        long max = sorted.get(sorted.size() - 1);
        long med = median(sorted);
        double avg = sorted.stream().mapToLong(Long::longValue).average().orElse(0);
        double stddev = Math.sqrt(
            sorted.stream().mapToDouble(v -> Math.pow(v - avg, 2)).average().orElse(0));

        System.out.printf("  %s:%n", label);
        System.out.printf("    中位数: %,.0f ns (%.2f ms)%n", (double)med, med/1_000_000.0);
        System.out.printf("    平均值: %,.0f ns (%.2f ms)%n", avg, avg/1_000_000.0);
        System.out.printf("    最小:   %,.0f ns    最大:   %,.0f ns%n", (double)min, (double)max);
        System.out.printf("    标准差: %,.0f ns%n%n", stddev);
    }

    static long median(List<Long> sorted) {
        int mid = sorted.size() / 2;
        if (sorted.size() % 2 == 1) {
            return sorted.get(mid);
        } else {
            return (sorted.get(mid - 1) + sorted.get(mid)) / 2;
        }
    }
}
