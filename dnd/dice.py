"""
Dice rolling utilities for D&D
"""

import random
import re


def roll_dice(notation: str) -> int:
    """
    Roll dice using standard D&D notation (e.g., '1d20', '2d6+3')
    
    Args:
        notation: Dice notation string (e.g., '1d20', '2d6+3', '3d8-2')
        
    Returns:
        The total result of the dice roll
        
    Examples:
        >>> result = roll_dice('1d20')  # Roll one 20-sided die
        >>> result = roll_dice('2d6+3')  # Roll two 6-sided dice and add 3
    """
    # Parse dice notation (e.g., "2d6+3" or "1d20")
    pattern = r'(\d+)d(\d+)([+-]\d+)?'
    match = re.match(pattern, notation.lower().replace(' ', ''))
    
    if not match:
        raise ValueError(f"Invalid dice notation: {notation}")
    
    num_dice = int(match.group(1))
    num_sides = int(match.group(2))
    modifier = int(match.group(3)) if match.group(3) else 0
    
    # Roll the dice
    total = sum(random.randint(1, num_sides) for _ in range(num_dice))
    
    return total + modifier


if __name__ == "__main__":
    # Example usage
    print(f"Rolling 1d20: {roll_dice('1d20')}")
    print(f"Rolling 2d6+3: {roll_dice('2d6+3')}")
    print(f"Rolling 3d8-2: {roll_dice('3d8-2')}")
