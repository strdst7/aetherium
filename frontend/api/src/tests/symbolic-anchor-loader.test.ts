import { SymbolicAnchorLoader } from '../services/symbolic-anchor-loader';

describe('SymbolicAnchorLoader', () => {
  it('should load anchors gracefully', async () => {
    const loader = new SymbolicAnchorLoader();
    const anchors = await loader.load();
    expect(anchors).toBeInstanceOf(Map);
    // Even if file is missing, it shouldn't crash
  });
});
